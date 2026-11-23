import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { abrirChrome, chromeDisponivel } from "./helpers/chrome.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const id = "000000000000000000000001";
const usuario = { _id: "000000000000000000000099", perfil: "user" };
const entrada = `
import React from 'react'; import {createRoot} from 'react-dom/client'; import {MemoryRouter} from 'react-router-dom';
import AuthContext from '/src/contexts/authContextValue.js'; import api,{definirTokenCsrf} from '/src/services/api.js';
import CadastroTrilha from '/src/pages/CadastroTrilha.jsx'; import '/src/styles/product.css';
import {criarEnviosPublicacao} from '/src/services/enviosPublicacao.js';
api.defaults.baseURL=location.origin;definirTokenCsrf('csrf-sintetico');
const root=createRoot(document.getElementById('root'));
let fila, idAtual;
window.encerrarEnvio=()=>{fila?.encerrar();fila=null;idAtual=null;};
window.montar=(usuario)=>{
  if(usuario?._id!==idAtual){window.encerrarEnvio();idAtual=usuario?._id;fila=usuario?criarEnviosPublicacao():null;}
  root.render(React.createElement(MemoryRouter,null,React.createElement(AuthContext.Provider,{value:{usuario,enviosPublicacao:fila}},React.createElement(CadastroTrilha))));
};
window.ocultar=()=>root.render(null);
`;
async function esperar(fn, nome) {
  const fim = Date.now() + 10000;
  while (Date.now() < fim) { if (await fn()) return; await new Promise((r) => setTimeout(r, 20)); }
  throw new Error(`Timeout: ${nome}`);
}
test("Cadastro: formulário e multipart reais no navegador com API sintética", { skip: !chromeDisponivel && "Chrome local ausente", timeout: 150000 }, async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "pnt-cadastro-"));
  const requests = [], pendentes = [];
  let modo = {}, servidor, chrome;
  try {
    servidor = await createServer({ root, configFile: false, cacheDir: join(temp, "vite"), logLevel: "error", server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, plugins: [react(), {
      name: "cadastro-synthetic-only",
      resolveId(id) { if (id === "/__cadastro.jsx") return "\0cadastro-test.jsx"; },
      load(id) { if (id === "\0cadastro-test.jsx") return entrada; },
      configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
        if (req.url === "/__test") { res.setHeader("Content-Type", "text/html"); res.setHeader("Set-Cookie", "synthetic=1; HttpOnly; Path=/; SameSite=Lax"); res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/__cadastro.jsx"></script></body></html>'); return; }
        if (!req.url.startsWith("/trilhas") && !req.url.startsWith("/usuarios")) return next();
        let body = ""; for await (const chunk of req) body += chunk.toString();
        const registro = { url: req.url, method: req.method, body, headers: req.headers }; requests.push(registro);
        const json = (status, data) => { if (res.destroyed) return; res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
        if (req.url === "/usuarios/refresh") { json(200, {}); return; }
        const upload = req.url.endsWith("/fotos"), index = requests.filter((r) => r.url.endsWith("/fotos")).length;
        const status = upload ? (modo.falhaFoto === index ? 502 : 201) : (modo.status || 201);
        const entrada = upload ? null : JSON.parse(body);
        const responder = () => json(status, status >= 400 ? { mensagem: upload ? "Falha no envio da foto." : "Corrija a localização.", erros: upload ? [] : ["Endereço inválido."] } : upload ? { _id: String(index), url: null } : { _id: id, status: modo.estado || "pending", fotos: [], fotosPrevistas: entrada.fotosPrevistas });
        if ((!upload && modo.hold) || (upload && modo.holdFoto)) pendentes.push(responder); else responder();
      }); },
    }] });
    await servidor.listen(); const origem = `http://127.0.0.1:${servidor.httpServer.address().port}`;
    await (await fetch(origem + "/__test")).text(); await (await fetch(origem + "/__cadastro.jsx")).text();
    chrome = await abrirChrome(join(temp, "chrome")); await chrome.navegar(origem + "/__test");
    await esperar(() => chrome.avaliar("typeof montar==='function'"), "entrada");
    const texto = () => chrome.avaliar("document.getElementById('root').textContent");
    const montar = async (user = usuario) => { await chrome.avaliar(`montar(${JSON.stringify(user)})`); await esperar(() => chrome.avaliar("Boolean(document.querySelector('main'))"), "montagem"); };
    const ocultar = async () => { await chrome.avaliar("ocultar()"); await esperar(() => chrome.avaliar("document.querySelector('main')===null"), "desmontagem"); };
    const preencher = async () => {
      await chrome.avaliar(`(()=>{for(const [id,valor] of [['titulo',' Trilha teste '],['descricao',' Descrição teste '],['endereco',' Local teste ']]){const el=document.getElementById(id);Object.getOwnPropertyDescriptor(id==='descricao'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,valor);el.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
    };
    const selecionar = (n, type = "image/png", tamanho = 10) => chrome.avaliar(`(()=>{const dt=new DataTransfer();for(let i=0;i<${n};i++)dt.items.add(new File([new Uint8Array(${tamanho})],'foto'+i+'.png',{type:${JSON.stringify(type)}}));const el=document.getElementById('fotos-publicacao');el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const enviar = () => chrome.avaliar("document.querySelector('form').requestSubmit()");
    t.afterEach(async () => { await ocultar(); await chrome.avaliar("encerrarEnvio()"); pendentes.splice(0).forEach((fn) => fn()); requests.length = 0; modo = {}; });
    await t.test("cria pending sem fotos com dez respostas e duração, sem campos internos", async () => {
      await montar(); await preencher();
      await chrome.avaliar("(()=>{for(const field of ['tipoLocal','dificuldade','condicaoCaminho','sinalizacao','estacionamento','banheiro','alimentacao','estruturaBanho','acesso'])document.getElementById('resposta-'+field+'-0').click();})()");
      await chrome.avaliar("document.getElementById('resposta-caracteristicaPrincipal-0').click();document.querySelector('[aria-label=\"Aumentar horas\"]').click();true");
      await enviar(); await esperar(async () => (await texto()).includes("Publicação cadastrada como pendente"), "sucesso");
      assert.equal(requests.length, 1); assert.equal(requests[0].url, "/trilhas");
      const data = JSON.parse(requests[0].body);
      assert.equal(data.titulo, "Trilha teste"); assert.equal(data.endereco, "Local teste"); assert.equal(data.tipoLocal, "Trilha");
      assert.equal(Object.keys(data).length, 14); assert.deepEqual(data.duracao, { horas: 1, minutos: 0 });
      for (const campo of ["status", "proprietario", "fotos"]) assert.equal(Object.hasOwn(data, campo), false);
      assert.equal(await chrome.avaliar("document.querySelector('.publicationResult a').getAttribute('href')"), "/perfil");
    });
    await t.test("cinco fotos em sequência: boundary real, único campo imagem, cookies e CSRF", async () => {
      modo.hold = true; await montar(); await preencher(); await selecionar(5);
      await chrome.avaliar("(()=>{const form=document.querySelector('form');form.requestSubmit();form.requestSubmit();})()");
      await esperar(() => pendentes.length === 1, "cadastro pendente"); assert.equal(requests.length, 1);
      pendentes.shift()(); await esperar(async () => (await texto()).includes("5 fotos com envio confirmado"), "cinco fotos");
      assert.equal(requests.length, 6);
      assert.equal(JSON.parse(requests[0].body).fotosPrevistas, 5);
      for (let i = 0; i < 5; i++) {
        const req = requests[i + 1]; assert.equal(req.url, `/trilhas/${id}/fotos`); assert.equal(req.method, "POST");
        assert.match(req.headers["content-type"], /^multipart\/form-data; boundary=/); assert.equal(req.headers["x-csrf-token"], "csrf-sintetico"); assert.match(req.headers.cookie, /synthetic=1/);
        assert.equal((req.body.match(/name="imagem"/g) || []).length, 1); assert.match(req.body, new RegExp(`filename="foto${i}.png"`));
      }
    });
    await t.test("falha parcial preserva cadastro e sucesso anterior, interrompendo restantes", async () => {
      modo.falhaFoto = 2; await montar(); await preencher(); await selecionar(3); await enviar();
      await esperar(async () => (await texto()).includes("Falha no envio da foto."), "falha parcial");
      assert.equal(requests.length, 3); assert.match(await texto(), /1 foto com envio confirmado/);
      assert.match(await texto(), /Envio não confirmado/); assert.match(await texto(), /Envio não iniciado/);
      assert.equal(await chrome.avaliar("document.querySelector('form')===null"), true);
    });
    await t.test("validação bloqueia excesso, MIME e tamanho antes de criar publicação", async () => {
      await montar(); await preencher();
      for (const caso of [[6, "image/png", 1], [1, "image/svg+xml", 1], [1, "image/png", 5242881]]) {
        await selecionar(...caso); await enviar(); await esperar(() => chrome.avaliar("Boolean(document.querySelector('.publicationPhotos [role=alert]'))"), "erro de fotos");
        assert.equal(requests.length, 0);
      }
    });
    await t.test("erro 400 mostra mensagem/detalhes e conserva formulário para correção", async () => {
      modo.status = 400; await montar(); await preencher(); await enviar();
      await esperar(async () => (await texto()).includes("Endereço inválido."), "erro JSON");
      assert.match(await texto(), /Corrija a localização/); assert.equal(await chrome.avaliar("document.getElementById('titulo').value"), " Trilha teste ");
      modo = {}; await enviar(); await esperar(async () => (await texto()).includes("Publicação cadastrada como pendente"), "correção");
    });
    await t.test("resultado incerto ou contrato inesperado bloqueia novo cadastro e não envia fotos", async () => {
      for (const config of [{ status: 500 }, { estado: "approved" }]) {
        modo = config; await montar(); await preencher(); await selecionar(1); const antes = requests.length; await enviar();
        await esperar(async () => (await texto()).includes("Cadastro sem confirmação"), "incerto");
        assert.equal(requests.length, antes + 1); assert.equal(await chrome.avaliar("document.querySelector('form')===null"), true); await ocultar();
      }
    });
    await t.test("navegar antes da resposta do cadastro mantém toda a sequência de fotos", async () => {
      modo.hold = true; await montar(); await preencher(); await selecionar(2); await enviar(); await esperar(() => pendentes.length === 1, "POST retido");
      await ocultar(); pendentes.shift()();
      await esperar(() => requests.length === 3, "continuação de todos os envios");
      assert.equal(await chrome.avaliar("document.querySelector('main')===null"), true);
    });
    await t.test("sair durante o primeiro upload não cancela a fila e voltar mostra o progresso", async () => {
      modo.holdFoto = true; await montar(); await preencher(); await selecionar(2); await enviar(); await esperar(() => pendentes.length === 1, "foto retida");
      await ocultar(); pendentes.shift()();
      await esperar(() => pendentes.length === 1 && requests.length === 3, "segunda foto iniciada em outra tela");
      await montar();
      await esperar(async () => (await texto()).includes("1 / 2"), "progresso conservado");
      assert.match(await texto(), /Aguardando o envio das fotos/);
      pendentes.shift()();
      await esperar(async () => (await texto()).includes("2 fotos com envio confirmado"), "fim do envio");
      assert.match(await texto(), /Aguardando aprovação administrativa/);
    });
    await t.test("logout durante upload cancela sequência e remove dados do formulário", async () => {
      modo.holdFoto = true; await montar(); await preencher(); await selecionar(3); await enviar(); await esperar(() => pendentes.length === 1, "foto retida");
      await montar(null); pendentes.shift()(); await chrome.avaliar("new Promise(r=>setTimeout(r,100))");
      assert.match(await texto(), /Entre na sua conta/); assert.equal(requests.length, 2); assert.doesNotMatch(await texto(), /Trilha teste|foto0/);
    });
  } finally {
    pendentes.splice(0).forEach((fn) => fn());
    try { await chrome?.fechar(); } finally { try { await servidor?.close(); } finally { await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } }
  }
});
