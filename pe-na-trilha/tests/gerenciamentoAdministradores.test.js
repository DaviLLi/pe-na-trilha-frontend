import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { abrirChrome, chromeDisponivel } from "./helpers/chrome.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const rota = "/admin/administradores";
const csrf = "csrf-sintetico-equipe";
const senha = "Senha-sintetica-123!";
const prioridade = { _id: "000000000000000000000001", nomeCompleto: "Pessoa Principal", email: "principal@example.invalid", principal: true };
const comum = { _id: "000000000000000000000002", nomeCompleto: "Pessoa Moderadora", email: "moderadora@example.invalid", principal: false };
const promovida = { _id: "000000000000000000000003", nomeCompleto: "Pessoa Promovida", email: "nova@example.invalid", principal: false };
const usuario = (conta, perfil = "admin") => ({ _id: conta._id, nomeCompleto: conta.nomeCompleto, email: conta.email, perfil });
const entrada = [
  "import React from 'react'; import {createRoot} from 'react-dom/client';",
  "import {BrowserRouter} from 'react-router-dom'; import App from '/src/App.jsx';",
  "import {AuthProvider} from '/src/contexts/AuthContext.jsx'; import api from '/src/services/api.js';",
  "api.defaults.baseURL = location.origin;",
  "const root = createRoot(document.getElementById('root')); let seq = 0;",
  "window.abrir = (pagina) => { history.replaceState(null, '', pagina);",
  "root.render(React.createElement(BrowserRouter, {key: ++seq}, React.createElement(AuthProvider, null, React.createElement(App)))); };",
  "window.ocultar = () => root.render(null);",
].join("\n");

async function esperar(condicao, descricao) {
  const limite = Date.now() + 15000;
  while (Date.now() < limite) {
    if (await condicao()) return;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  assert.fail("Tempo excedido ao verificar " + descricao);
}

test("Gerenciamento de administradores no navegador com API sintética", {
  skip: !chromeDisponivel && "Chrome local ausente; configure PNT_CHROME_BIN.", timeout: 180000,
}, async (t) => {
  const temporario = await mkdtemp(join(tmpdir(), "pnt-admin-manage-"));
  const consultas = [], envios = [], pendentesGet = [], pendentesPost = [];
  let servidor, chrome, autenticado, lista, fila, modoGet, modoPost, decisoes, principalAtivo, csrfAtual;

  function responderJson(resposta, status, corpo) {
    if (resposta.destroyed) return;
    resposta.statusCode = status;
    resposta.setHeader("Cache-Control", "no-store");
    resposta.setHeader("Content-Type", "application/json");
    resposta.end(status === 204 ? undefined : JSON.stringify(corpo));
  }

  try {
    servidor = await createServer({ root, configFile: false, cacheDir: join(temporario, "vite"), logLevel: "error",
      server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, plugins: [react(), {
        name: "gerenciamento-admin-fixture",
        resolveId(id) { if (id === "/__equipe.jsx") return "\0pnt-equipe-test.jsx"; },
        load(id) { if (id === "\0pnt-equipe-test.jsx") return entrada; },
        configureServer(vite) {
          vite.middlewares.use(async (req, res, next) => {
            const pathname = req.url.split("?")[0];
            if (pathname === "/__equipe") {
              res.setHeader("Content-Type", "text/html");
              res.setHeader("Set-Cookie", "sessao_sintetica=ativa; HttpOnly; SameSite=Lax; Path=/");
              res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__equipe.jsx"></script></body></html>');
              return;
            }

            if (pathname === "/usuarios/refresh") {
              responderJson(res, autenticado ? 200 : 401, autenticado ? { usuario: autenticado } : { mensagem: "Sessão encerrada." });
              return;
            }
            if (pathname === "/usuarios/csrf") {
              responderJson(res, 200, { csrfToken: csrfAtual });
              return;
            }
            if (pathname === "/usuarios/me") {
              responderJson(res, autenticado ? 200 : 401, autenticado || { mensagem: "Sessão encerrada." });
              return;
            }
            if (pathname === "/trilhas" || pathname === "/trilhas/pendentes") {
              responderJson(res, 200, pathname === "/trilhas" ? [] : fila);
              return;
            }
            if (pathname.endsWith("/moderacao")) {
              let corpo = "";
              for await (const dado of req) corpo += dado.toString();
              const { status, revisao } = JSON.parse(corpo);
              assert.equal(revisao, fila[0].revisao);
              decisoes++;
              responderJson(res, 200, { ...fila[0], status });
              fila = [];
              return;
            }
            if (pathname === rota) {
              consultas.push(req.headers.cookie);
              const responder = () => {
                if (!autenticado) return responderJson(res, 401, { mensagem: "Sessão encerrada." });
                if (autenticado._id !== prioridade._id || !principalAtivo) return responderJson(res, 403, { mensagem: "Acesso exclusivo do administrador principal." });
                if (modoGet.status) return responderJson(res, modoGet.status, { mensagem: "Indisponível." });
                return responderJson(res, 200, { administradores: lista });
              };
              if (modoGet.aguardar) pendentesGet.push(responder); else responder();
              return;
            }
            if (pathname === rota + "/promover" || pathname === rota + "/remover") {
              let corpo = "";
              for await (const dado of req) corpo += dado.toString();
              const dados = JSON.parse(corpo);
              envios.push({ pathname, dados, csrf: req.headers["x-csrf-token"], cookie: req.headers.cookie });
              const operacao = modoPost;
              const responder = () => {
                if (operacao.status) {
                  if (operacao.status === 401) autenticado = null;
                  return responderJson(res, operacao.status, { mensagem: operacao.mensagem });
                }
                if (pathname.endsWith("/promover")) lista = [...lista, promovida];
                else lista = lista.filter((admin) => admin.email !== dados.email);
                return responderJson(res, 204);
              };
              if (operacao.aguardar) pendentesPost.push(responder); else responder();
              return;
            }
            next();
          });
        },
      }],
    });
    await servidor.listen();
    const origem = "http://127.0.0.1:" + servidor.httpServer.address().port;
    assert.equal((await fetch(origem + "/__equipe.jsx")).status, 200);
    chrome = await abrirChrome(join(temporario, "chrome"));
    await chrome.viewport(1280, 960);
    await chrome.navegar(origem + "/__equipe");
    await esperar(() => chrome.avaliar("typeof abrir === 'function'"), "entrada do navegador");

    const visivel = (seletor) => chrome.avaliar("Boolean(document.querySelector(" + JSON.stringify(seletor) + "))");
    const texto = () => chrome.avaliar("document.body.innerText");
    const contem = async (trecho) => (await texto()).includes(trecho);
    const pathname = () => chrome.avaliar("location.pathname");
    const nav = '.productNav a[href="' + rota + '"]';
    const dialogo = "dialog.adminManageDialog[open]";
    const senhaVazia = () => chrome.avaliar("document.querySelector('#admin-manage-password')?.value === ''");
    const clicar = (seletor) => chrome.avaliar("document.querySelector(" + JSON.stringify(seletor) + ").click()");
    const abrir = (caminho = rota) => chrome.avaliar("abrir(" + JSON.stringify(caminho) + ")");
    async function preencher(seletor, valor) {
      await chrome.avaliar("(() => { const campo = document.querySelector(" + JSON.stringify(seletor)
        + "); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(campo, "
        + JSON.stringify(valor) + "); campo.dispatchEvent(new Event('input', { bubbles: true })); })()");
    }
    async function abrirPromocao(email = promovida.email) {
      await preencher("#admin-manage-email", email);
      await chrome.avaliar("document.querySelector('.adminManageForm').requestSubmit()");
      await esperar(() => visivel(dialogo), "diálogo de promoção");
    }
    async function abrirRemocao(email = comum.email) {
      await clicar('.adminManageAccount button[aria-label="Remover ' + email + '"]');
      await esperar(() => visivel(dialogo), "diálogo de remoção");
    }
    async function enviarSenha() {
      await preencher("#admin-manage-password", senha);
      await chrome.avaliar("document.querySelector('dialog.adminManageDialog form').requestSubmit()");
    }
    async function abrirPrincipal() {
      autenticado = usuario(prioridade);
      await abrir();
      await esperar(() => visivel(".adminManageAccount[data-principal=true]"), "lista autorizada");
    }

    t.beforeEach(() => {
      autenticado = null;
      lista = [comum, prioridade];
      fila = [];
      modoGet = {};
      modoPost = {};
      decisoes = 0;
      principalAtivo = true;
      csrfAtual = csrf;
      consultas.length = 0;
      envios.length = 0;
    });
    t.afterEach(async () => {
      await chrome.avaliar("ocultar()");
      await esperar(() => chrome.avaliar("document.querySelector('#root').children.length === 0"), "desmontagem");
      for (const fila of [pendentesGet, pendentesPost]) fila.splice(0).forEach((responder) => responder());
    });

    await t.test("bloqueia visitante e usuário comum antes de solicitar a lista", async () => {
      await abrir();
      await esperar(async () => await pathname() === "/login" && await visivel("#identificador"), "login obrigatório");
      assert.equal(consultas.length, 0);
      autenticado = usuario(promovida, "user");
      await abrir();
      await esperar(async () => await pathname() === "/trilhas", "rota protegida para perfil comum");
      assert.equal(await visivel(nav), false);
      assert.equal(consultas.length, 0);
    });

    await t.test("administrador comum recebe acesso negado e ainda pode aprovar na moderação", async () => {
      autenticado = usuario(comum);
      fila = [{ _id: promovida._id, proprietario: promovida._id, status: "pending", revisao: "legacy:1",
        titulo: "Trilha sintética", descricao: "Publicação para moderação.", endereco: "Destino de teste", fotos: [] }];
      await abrir();
      await esperar(async () => await pathname() === "/admin" && await visivel(".adminPostCard"), "retorno à moderação");
      assert.equal(await visivel(nav), false);
      assert.equal(await visivel(".adminManagePage"), false);
      assert.match(await texto(), /Seu acesso ao gerenciamento/);
      await clicar(".adminDecisionButtons .primaryButton");
      await esperar(() => contem("Publicação aprovada."), "moderação existente");
      assert.equal(decisoes, 1);
    });

    await t.test("habilita o link e lista somente após confirmação da identidade pelo GET", async () => {
      autenticado = usuario(prioridade);
      modoGet.aguardar = true;
      await abrir("/admin");
      await esperar(() => pendentesGet.length === 1, "GET inicial pendente");
      assert.equal(await visivel(nav), false);
      modoGet.aguardar = false;
      pendentesGet.shift()();
      await esperar(() => visivel(nav), "link autorizado");
      await clicar(nav);
      await esperar(() => visivel(".adminManageAccount[data-principal=true]"), "lista carregada");
      assert.equal(await pathname(), rota);
      assert.equal(await visivel(".adminManageAccount[data-principal=true] button"), false);
      assert.match(await texto(), /Administrador principal/);
      for (const conta of lista) {
        assert.match(await texto(), new RegExp(conta.nomeCompleto));
        assert.ok((await texto()).includes(conta.email));
      }
      assert.ok(consultas.length >= 2);
      assert.ok(consultas.every((cookie) => cookie.includes("sessao_sintetica=ativa")));
    });

    await t.test("recusa confirmação incompatível e permite repetir GET com erro temporário", async () => {
      autenticado = usuario(prioridade);
      modoGet.status = 500;
      await abrir();
      await esperar(() => contem("Não foi possível consultar os administradores."), "erro na consulta");
      assert.equal(await visivel(".adminManageForm"), false);
      assert.equal(await visivel(nav), false);
      modoGet.status = 0;
      lista = [{ ...comum, principal: true }, { ...prioridade, principal: false }];
      await clicar(".adminManagePage .adminRefreshButton");
      await esperar(async () => await pathname() === "/admin", "negação por identidade divergente");
      assert.equal(await visivel(nav), false);
    });

    await t.test("promove com sessão e CSRF, limpa a senha e impede envio duplicado", async () => {
      await abrirPrincipal();
      await abrirPromocao();
      assert.equal(await chrome.avaliar("document.activeElement.id"), "admin-manage-password");
      assert.equal(await senhaVazia(), true);
      modoPost = { aguardar: true };
      await preencher("#admin-manage-password", senha);
      await chrome.avaliar(`(() => {
        const form = document.querySelector('dialog form');
        const campo = document.querySelector('#admin-manage-password');
        form.requestSubmit();
        campo.value = ${JSON.stringify(senha)};
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      })()`);
      await esperar(() => pendentesPost.length === 1, "POST de promoção");
      assert.equal(await senhaVazia(), true);
      assert.equal(await chrome.avaliar("document.querySelector('dialog button[type=submit]').disabled"), true);
      await chrome.pressionarTecla("Escape");
      assert.equal(await visivel(dialogo), true);
      const antes = consultas.length;
      pendentesPost.shift()();
      await esperar(() => contem("Administrador promovido com sucesso."), "sucesso");
      await esperar(() => contem(promovida.nomeCompleto), "lista atualizada");
      assert.equal(await visivel(dialogo), false);
      assert.equal(await chrome.avaliar("document.querySelector('#admin-manage-email').value"), "");
      assert.equal(envios.length, 1);
      assert.deepEqual(envios[0], { pathname: rota + "/promover", dados: { email: promovida.email, senha }, csrf, cookie: "sessao_sintetica=ativa" });
      assert.ok(consultas.length > antes);
      assert.equal(await chrome.avaliar("JSON.stringify(localStorage).includes(" + JSON.stringify(senha) + ") || JSON.stringify(sessionStorage).includes(" + JSON.stringify(senha) + ")"), false);
    });

    await t.test("permite cancelar e reabrir remoção e mostra vazio após remover o último administrador comum", async () => {
      await abrirPrincipal();
      await abrirRemocao();
      await preencher("#admin-manage-password", senha);
      await chrome.pressionarTecla("Escape");
      await esperar(async () => !(await visivel(dialogo)), "fechamento por teclado");
      assert.equal(envios.length, 0);
      await abrirRemocao();
      assert.equal(await senhaVazia(), true);
      const antes = consultas.length;
      await enviarSenha();
      await esperar(() => contem("Administrador removido com sucesso."), "remoção confirmada");
      await esperar(() => contem("Nenhum administrador comum cadastrado."), "lista sem administradores comuns");
      assert.equal(await visivel(".adminManageAccount[data-principal=true]"), true);
      assert.equal(await visivel(".adminManageAccount button"), false);
      assert.equal(envios.length, 1);
      assert.equal(envios[0].pathname, rota + "/remover");
      assert.deepEqual(envios[0].dados, { email: comum.email, senha });
      assert.ok(consultas.length > antes);
    });

    await t.test("explica 404, 409, 422, 429 e 500 e pede senha de novo para cada tentativa", async () => {
      await abrirPrincipal();
      await abrirPromocao();
      for (const [status, mensagem, trecho] of [
        [404, "Conta não encontrada.", "A conta informada não foi encontrada."],
        [409, "Essa conta já é administradora.", "Essa conta já é administradora."],
        [422, "Campo inválido.", "Verifique o e-mail e a senha atual"],
        [429, "Limite.", "Limite de tentativas atingido. Aguarde"],
        [500, "Erro interno.", "Não foi possível confirmar a alteração"],
      ]) {
        modoPost = { status, mensagem };
        await enviarSenha();
        await esperar(() => contem(trecho), "mensagem HTTP " + status);
        assert.equal(await senhaVazia(), true);
        assert.equal(await chrome.avaliar("document.activeElement.id"), "admin-manage-password");
      }
      assert.equal(envios.length, 5);
      assert.equal(await visivel(dialogo), true);
    });

    await t.test("senha incorreta mantém o diálogo aberto e permite nova confirmação", async () => {
      await abrirPrincipal();
      await abrirRemocao();
      modoPost = { status: 403, mensagem: "Não foi possível confirmar sua identidade." };
      await enviarSenha();
      await esperar(() => contem("Confira sua senha antes de tentar novamente"), "erro no diálogo");
      assert.equal(await pathname(), rota);
      assert.equal(await visivel(dialogo), true);
      assert.equal(await senhaVazia(), true);
      assert.equal(await chrome.avaliar("document.activeElement.id"), "admin-manage-password");
      modoPost = {};
      await enviarSenha();
      await esperar(() => contem("Administrador removido com sucesso."), "nova confirmação aceita");
      assert.equal(envios.length, 2);
    });

    await t.test("403 de CSRF renova o token e pede nova confirmação no diálogo", async () => {
      await abrirPrincipal();
      await abrirRemocao();
      csrfAtual = "csrf-recuperado";
      modoPost = { status: 403, mensagem: "Token CSRF ausente ou inválido." };
      await enviarSenha();
      await esperar(() => contem("A verificação de segurança foi renovada"), "recuperação de CSRF");
      assert.equal(await pathname(), rota);
      assert.equal(await visivel(dialogo), true);
      assert.equal(envios.length, 1);
      assert.equal(envios[0].csrf, csrf);
      modoPost = {};
      await enviarSenha();
      await esperar(() => contem("Administrador removido com sucesso."), "confirmação com CSRF novo");
      assert.deepEqual(envios.map((envio) => envio.csrf), [csrf, "csrf-recuperado"]);
    });

    await t.test("perda de autorização fecha o gerenciamento e mantém a sessão", async () => {
      await abrirPrincipal();
      await abrirRemocao();
      modoPost = { status: 403, mensagem: "Acesso exclusivo do administrador principal." };
      principalAtivo = false;
      await enviarSenha();
      await esperar(async () => await pathname() === "/admin" && await visivel(".adminManageAccessNotice"), "saída do gerenciamento");
      assert.equal(await visivel(dialogo), false);
      assert.equal(await visivel(".adminPage"), true);
      assert.match(await texto(), /acesso ao gerenciamento.*não está disponível/);
    });

    await t.test("encerra o formulário quando o refresh da sessão retorna 401", async () => {
      await abrirPrincipal();
      await abrirPromocao();
      modoPost = { status: 401 };
      await enviarSenha();
      await esperar(async () => await pathname() === "/login" && await visivel("#identificador"), "sessão encerrada");
      assert.equal(await visivel(dialogo), false);
      assert.equal(await visivel(nav), false);
      assert.equal(envios.length, 1);
    });

    await t.test("mantém lista, navegação e diálogo acessíveis em 320 px e desktop", async () => {
      lista = [prioridade, { ...comum, email: "e".repeat(92) + "@example.invalid" }];
      await abrirPrincipal();
      await abrirRemocao(lista[1].email);
      for (const largura of [320, 390, 1280]) {
        await chrome.viewport(largura, 820);
        assert.equal(await chrome.avaliar("document.documentElement.scrollWidth === document.documentElement.clientWidth"), true);
        assert.equal(await chrome.avaliar("(() => { const { left, right } = document.querySelector('dialog').getBoundingClientRect(); return left >= 0 && right <= innerWidth; })()"), true);
      }
    });
  } finally {
    for (const fila of [pendentesGet, pendentesPost]) fila.splice(0).forEach((responder) => responder());
    try { await chrome?.fechar(); } finally {
      try { await servidor?.close(); } finally { await rm(temporario, { recursive: true, force: true, maxRetries: 5 }); }
    }
  }
});
