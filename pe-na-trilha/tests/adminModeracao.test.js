import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { abrirChrome, chromeDisponivel } from "./helpers/chrome.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const id = (n) => n.toString(16).padStart(24, "0");
const admin = { _id: id(99), perfil: "admin" };
const autor = id(88);
const caminhoFoto = (n, f) => `/admin/trilhas/${id(n)}/fotos/${id(f)}/conteudo`;
const post = (n, fotos = []) => ({ _id: id(n), titulo: `Publicação ${n}`, descricao: "Descrição para revisão.", endereco: "Endereço sintético", proprietario: autor, status: "pending", fotos });
const foto = (n, f) => ({ _id: id(f), url: caminhoFoto(n, f) });
const entrada = `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { MemoryRouter } from 'react-router-dom';
  import AuthContext from '/src/contexts/authContextValue.js';
  import api, { definirTokenCsrf } from '/src/services/api.js';
  import Admin from '/src/pages/Admin.jsx';
  import Sidebar from '/src/components/Sidebar.jsx';
  import '/src/styles/product.css';
  api.defaults.baseURL = location.origin; definirTokenCsrf('csrf-sintetico');
  const root = createRoot(document.getElementById('root'));
  window.renderAdmin = (usuario) => root.render(React.createElement(MemoryRouter,null,
    React.createElement(AuthContext.Provider,{value:{usuario}},React.createElement(React.Fragment,null,React.createElement(Sidebar),React.createElement(Admin)))));
  window.ocultarAdmin = () => root.render(null);
  window.marcadorPagina = 'pagina-original';
  const criar=URL.createObjectURL.bind(URL), revogar=URL.revokeObjectURL.bind(URL);
  window.urlsAdmin={criadas:[],revogadas:[]};
  URL.createObjectURL=(blob)=>{const url=criar(blob);window.urlsAdmin.criadas.push(url);return url;};
  URL.revokeObjectURL=(url)=>{window.urlsAdmin.revogadas.push(url);return revogar(url);};
`;
async function esperar(condicao, nome) {
  const fim = Date.now() + 10000;
  while (Date.now() < fim) { if (await condicao()) return; await new Promise((resolve) => setTimeout(resolve, 20)); }
  throw new Error(`Timeout: ${nome}`);
}
test("Admin: fila e decisões reais no navegador com backend sintético", {
  skip: !chromeDisponivel && "Chrome local ausente; configure PNT_CHROME_BIN.", timeout: 150000,
}, async (t) => {
  const temporario = await mkdtemp(join(tmpdir(), "pnt-admin-test-"));
  const requests = [], pendentesLista = [], pendentesFoto = [], pendentesDecisao = [], modoFotos = new Map(), modoDecisoes = new Map();
  let fila = { dados: [] }, pixel, servidor, chrome;
  try {
    servidor = await createServer({ root, configFile: false, cacheDir: join(temporario, "vite"), logLevel: "error",
      server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, plugins: [react(), {
        name: "admin-synthetic-test-only",
        resolveId(id) { if (id === "/__admin_entry.jsx") return "\0admin-test.jsx"; },
        load(id) { if (id === "\0admin-test.jsx") return entrada; },
        configureServer(vite) {
          vite.middlewares.use(async (req, res, next) => {
            const path = req.url.split("?")[0];
            if (path === "/__admin_test") {
              res.setHeader("Content-Type", "text/html"); res.setHeader("Set-Cookie", "synthetic_admin=1; HttpOnly; Path=/; SameSite=Lax");
              res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/__admin_entry.jsx"></script></body></html>'); return;
            }
            if (!path.startsWith("/trilhas") && !path.startsWith("/admin/trilhas") && !path.startsWith("/usuarios/")) return next();
            const registro = { url: req.url, method: req.method, csrf: req.headers["x-csrf-token"], cookie: req.headers.cookie };
            requests.push(registro); res.setHeader("Cache-Control", "private, no-store");
            const json = (status, data) => { if (res.destroyed) return; res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
            if (path === "/trilhas/pendentes") {
              const modo = fila; const responder = () => json(modo.status || 200, modo.dados);
              if (modo.hold) pendentesLista.push(responder); else responder(); return;
            }
            if (path.endsWith("/moderacao") && req.method === "POST") {
              let body = ""; for await (const chunk of req) body += chunk.toString(); registro.body = JSON.parse(body);
              const postId = path.split("/")[2], modo = modoDecisoes.get(postId) || {};
              const responder = () => {
                if (res.destroyed) return;
                if (modo.status) { json(modo.status, { mensagem: modo.mensagem }); return; }
                const atual = fila.dados.find((item) => item._id === postId); fila.dados = fila.dados.filter((item) => item._id !== postId);
                json(200, { ...atual, status: registro.body.status, motivoRejeicao: registro.body.motivo || null });
              };
              if (modo.hold) pendentesDecisao.push(responder); else responder(); return;
            }
            if (path.startsWith("/admin/trilhas/") && path.endsWith("/conteudo")) {
              const modo = modoFotos.get(path) || {};
              const responder = () => {
                if (res.destroyed) return;
                if (modo.status) { json(modo.status, { mensagem: "Foto de moderação indisponível." }); return; }
                res.setHeader("Content-Type", "image/webp"); res.end(modo.corrompida ? Buffer.from("invalid-webp") : pixel);
              };
              if (modo.hold) pendentesFoto.push(responder); else responder(); return;
            }
            json(404, { mensagem: "Endpoint não esperado pelo teste." });
          });
        },
      }],
    });
    await servidor.listen(); const origem = `http://127.0.0.1:${servidor.httpServer.address().port}`;
    assert.match(await (await fetch(origem + "/__admin_test")).text(), /__admin_entry/);
    await (await fetch(origem + "/__admin_entry.jsx")).text();
    chrome = await abrirChrome(join(temporario, "chrome")); await chrome.navegar(origem + "/__admin_test");
    await esperar(() => chrome.avaliar("typeof renderAdmin === 'function'"), "entrada Admin"); await chrome.viewport(1280, 1800);
    pixel = Buffer.from(await chrome.avaliar("(()=>{const c=document.createElement('canvas');c.width=c.height=1;return c.toDataURL('image/webp').split(',')[1];})()"), "base64");
    const texto = () => chrome.avaliar("document.querySelector('.adminPage')?.textContent || ''");
    const urls = () => chrome.avaliar("window.urlsAdmin");
    const ocultar = async () => { await chrome.avaliar("ocultarAdmin()"); await esperar(() => chrome.avaliar("document.querySelector('.adminPage') === null"), "desmontagem"); };
    const montar = async (usuario = admin) => { await chrome.avaliar(`renderAdmin(${JSON.stringify(usuario)})`); await esperar(() => chrome.avaliar("Boolean(document.querySelector('.adminPage'))"), "montagem"); };
    const cards = (n) => esperar(() => chrome.avaliar(`document.querySelectorAll('.adminPostCard').length === ${n}`), "cards da fila");
    const clicar = (n, rotulo) => chrome.avaliar(`(()=>{const c=document.querySelector('[data-publicacao-id="${id(n)}"]');[...c.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(rotulo)}).click();})()`);
    const escrever = (n, valor) => chrome.avaliar(`(()=>{const el=document.getElementById('motivo-${id(n)}');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(valor)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const prontas = async (n) => {
      await esperar(() => chrome.avaliar(`document.querySelectorAll('.adminPhoto img').length === ${n}`), "Blobs administrativos");
      await chrome.avaliar("(async()=>{for(const img of document.querySelectorAll('.adminPhoto img')){img.scrollIntoView({block:'center'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}})()");
      await esperar(() => chrome.avaliar(`document.querySelectorAll('.adminPhoto[aria-busy="false"] img').length === ${n}`), "fotos prontas");
    };
    t.afterEach(async () => {
      await ocultar();
      for (const fila of [pendentesLista, pendentesFoto, pendentesDecisao]) fila.splice(0).forEach((responder) => responder());
      modoFotos.clear(); modoDecisoes.clear();
    });

    await t.test("usuário comum e visitante não consultam fila nem fotos", async () => {
      const antes = requests.length;
      for (const usuario of [null, { _id: id(1), perfil: "user" }]) {
        await montar(usuario); await esperar(async () => (await texto()).includes("Acesso administrativo obrigatório"), "acesso restrito");
        assert.equal(await chrome.avaliar("document.querySelectorAll('.adminPostCard').length"), 0);
        assert.equal(await chrome.avaliar("Boolean(document.querySelector('a[href=\"/admin\"]'))"), false);
      }
      assert.equal(requests.length, antes);
    });
    await t.test("menu administrativo aparece somente para admin", async () => {
      await montar();
      await esperar(() => chrome.avaliar("Boolean(document.querySelector('a[href=\"/admin\"]'))"), "link administrativo");
      assert.equal(await chrome.avaliar("document.querySelector('a[href=\"/admin\"]').textContent.includes('Administração')"), true);
    });
    await t.test("fila mostra carregamento, dados, autor e miniaturas somente pelo endpoint administrativo", async () => {
      fila = { hold: true, dados: [post(1, [foto(1, 101), { _id: id(102), url: null }]), post(2, [foto(2, 103)])] };
      modoFotos.set(caminhoFoto(1, 101), { hold: true }); const antes = requests.length;
      await montar(); await esperar(() => pendentesLista.length === 1, "GET pendente");
      assert.match(await texto(), /Carregando publicações pendentes/); pendentesLista.shift()(); await cards(2);
      await esperar(() => pendentesFoto.length === 1, "foto pendente");
      for (const valor of ["Publicação 1", "Descrição para revisão.", "Endereço sintético", autor, "Foto indisponível", "Carregando foto"]) assert.ok((await texto()).includes(valor));
      pendentesFoto.shift()(); await prontas(2);
      const fotos = requests.slice(antes).filter((r) => r.url.includes("/conteudo")); assert.equal(fotos.length, 2);
      for (const req of fotos) { assert.match(req.url, /^\/admin\/trilhas\/.+\?variante=miniatura$/); assert.match(req.cookie, /synthetic_admin=1/); }
      assert.equal(await chrome.avaliar("[...document.querySelectorAll('.adminPhoto img')].every(img=>img.src.startsWith('blob:'))"), true);
    });
    await t.test("aprovação bloqueia clique duplicado e remove só o item após sucesso sem recarregar", async () => {
      fila = { dados: [post(3, [foto(3, 104)]), post(4)] }; modoDecisoes.set(id(3), { hold: true });
      const antes = requests.length; await montar(); await cards(2); await prontas(1);
      const objectUrl = (await urls()).criadas.at(-1); await escrever(3, "Texto não enviado na aprovação.");
      await chrome.avaliar(`(()=>{const b=document.querySelector('[data-publicacao-id="${id(3)}"] button');b.click();b.click();})()`);
      await esperar(() => pendentesDecisao.length === 1, "POST de aprovação");
      assert.equal(await chrome.avaliar(`document.querySelectorAll('[data-publicacao-id="${id(3)}"] button:disabled').length`), 2);
      assert.equal(await chrome.avaliar(`document.querySelector('[data-publicacao-id="${id(3)}"] textarea').disabled`), true);
      const posts = requests.slice(antes).filter((r) => r.method === "POST"); assert.equal(posts.length, 1);
      assert.deepEqual(posts[0].body, { status: "approved" }); assert.equal(posts[0].csrf, "csrf-sintetico"); await cards(2);
      pendentesDecisao.shift()(); await cards(1); assert.match(await texto(), /Publicação aprovada/); assert.match(await texto(), /Publicação 4/);
      assert.equal((await urls()).revogadas.filter((u) => u === objectUrl).length, 1);
      assert.equal(requests.slice(antes).filter((r) => r.url === "/trilhas/pendentes").length, 1);
      assert.equal(await chrome.avaliar("window.marcadorPagina"), "pagina-original");
    });
    await t.test("rejeição exige motivo e envia corpo exato antes de esvaziar a fila", async () => {
      fila = { dados: [post(5)] }; await montar(); await cards(1); const antes = requests.length;
      await escrever(5, "   "); await clicar(5, "Rejeitar");
      await esperar(async () => (await texto()).includes("Informe o motivo"), "motivo obrigatório");
      assert.equal(requests.slice(antes).filter((r) => r.method === "POST").length, 0);
      await escrever(5, "  Corrigir endereço.  "); await clicar(5, "Rejeitar");
      await esperar(async () => (await texto()).includes("Nenhuma publicação pendente"), "fila atualizada");
      const req = requests.slice(antes).find((r) => r.method === "POST");
      assert.equal(req.url, `/trilhas/${id(5)}/moderacao`); assert.deepEqual(req.body, { status: "rejected", motivo: "Corrigir endereço." });
      assert.match(await texto(), /Publicação rejeitada/);
    });
    await t.test("erros 403, 409 e 500 mantêm item, motivo e controles utilizáveis", async () => {
      for (const status of [403, 409, 500]) {
        fila = { dados: [post(status)] }; modoDecisoes.set(id(status), { status, mensagem: `Falha administrativa ${status}.` });
        await montar(); await cards(1); await escrever(status, "Corrigir percurso."); await clicar(status, "Rejeitar");
        await esperar(async () => (await texto()).includes(`Falha administrativa ${status}.`), "erro de decisão"); await cards(1);
        assert.equal(await chrome.avaliar(`document.getElementById('motivo-${id(status)}').value`), "Corrigir percurso.");
        assert.equal(await chrome.avaliar("document.querySelectorAll('.adminDecision button:disabled').length"), 0);
        await ocultar();
      }
    });
    await t.test("fila vazia e erro de consulta são estados distintos", async () => {
      fila = { dados: [] }; await montar(); await esperar(async () => (await texto()).includes("Nenhuma publicação pendente"), "vazia"); await ocultar();
      fila = { status: 500, dados: { mensagem: "Não foi possível consultar a fila." } };
      await montar(); await esperar(async () => (await texto()).includes("Não foi possível consultar a fila."), "erro da consulta");
      assert.doesNotMatch(await texto(), /Nenhuma publicação pendente/);
    });
    await t.test("foto indisponível preserva mensagem Blob e contextos incorretos não são buscados", async () => {
      fila = { dados: [post(6, [foto(6, 105), { _id: id(106), url: `/trilhas/minhas/${id(6)}/fotos/${id(106)}/conteudo` },
        { _id: id(107), url: "https://res.cloudinary.com/synthetic/photo.webp" }])] };
      modoFotos.set(caminhoFoto(6, 105), { status: 404 }); const antes = requests.length;
      await montar(); await esperar(async () => (await texto()).includes("Foto de moderação indisponível."), "erro Blob");
      assert.equal(requests.slice(antes).filter((r) => r.url.includes("/conteudo")).length, 1); assert.match(await texto(), /Foto indisponível/);
      assert.equal(await chrome.avaliar("document.querySelectorAll('.adminDecision button:disabled').length"), 0);
    });
    await t.test("perda de papel administrativo revoga fotos e remove a fila imediatamente", async () => {
      fila = { dados: [post(7, [foto(7, 108)])] }; await montar(); await prontas(1); const objectUrl = (await urls()).criadas.at(-1);
      await montar({ _id: admin._id, perfil: "user" });
      await esperar(async () => (await texto()).includes("Acesso administrativo obrigatório"), "papel removido");
      assert.equal(await chrome.avaliar("document.querySelectorAll('.adminPostCard, .adminPhoto img').length"), 0);
      assert.equal((await urls()).revogadas.filter((u) => u === objectUrl).length, 1);
    });
    await t.test("desmontagem cancela foto e decisão pendentes sem alterações tardias", async () => {
      fila = { dados: [post(8, [foto(8, 109)])] }; modoFotos.set(caminhoFoto(8, 109), { hold: true }); modoDecisoes.set(id(8), { hold: true });
      await montar(); await esperar(() => pendentesFoto.length === 1, "foto pendente"); await clicar(8, "Aprovar");
      await esperar(() => pendentesDecisao.length === 1, "decisão pendente"); const antes = (await urls()).criadas.length;
      await ocultar(); pendentesFoto.shift()(); pendentesDecisao.shift()();
      await chrome.avaliar("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
      assert.equal((await urls()).criadas.length, antes); assert.equal(await chrome.avaliar("document.querySelector('.adminPage') === null"), true);
      const resultado = await urls(); assert.deepEqual([...resultado.criadas].sort(), [...resultado.revogadas].sort());
    });
  } finally {
    for (const fila of [pendentesLista, pendentesFoto, pendentesDecisao]) fila.splice(0).forEach((responder) => responder());
    try { await chrome?.fechar(); } finally { try { await servidor?.close(); } finally { await rm(temporario, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } }
  }
});
