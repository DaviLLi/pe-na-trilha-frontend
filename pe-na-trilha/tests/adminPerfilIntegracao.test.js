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
const id = (n) => n.toString(16).padStart(24, "0");
const owner = { _id: id(99), perfil: "user", nomeCompleto: "Pessoa da trilha" };
const admin = { _id: id(88), perfil: "admin" };
const post = (n, status = "pending") => ({ _id: id(n), status, titulo: `Publicação ${n}`, descricao: "Descrição sintética", endereco: "Local sintético", proprietario: owner._id, fotos: [] });
const entrada = `
import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route} from 'react-router-dom';
import AuthContext from '/src/contexts/authContextValue.js';import api,{definirTokenCsrf} from '/src/services/api.js';import {listarTrilhas} from '/src/services/trilhasService.js';
import Admin from '/src/pages/Admin.jsx';import Perfil from '/src/pages/Perfil.jsx';import Sidebar from '/src/components/Sidebar.jsx';
import '/src/styles/style.css';import '/src/styles/community.css';
api.defaults.baseURL=location.origin;definirTokenCsrf('csrf-sintetico');
const root=createRoot(document.getElementById('root'));let seq=0;
window.abrir=(pagina,usuario)=>{
 const routes=React.createElement(Routes,null,React.createElement(Route,{path:'/admin',element:React.createElement(Admin)}),React.createElement(Route,{path:'/perfil',element:React.createElement(Perfil)}));
 const tela=React.createElement('div',{className:'appFrame'},React.createElement(Sidebar),routes);
 const sessao=React.createElement(AuthContext.Provider,{value:{usuario}},tela);
 root.render(React.createElement(MemoryRouter,{initialEntries:[pagina],key:++seq},sessao));
};
window.consultarFeed=()=>listarTrilhas();window.ocultar=()=>root.render(null);window.confirm=()=>true;
`;
async function esperar(fn, nome) { const fim = Date.now() + 10000;while (Date.now() < fim) { if (await fn()) return;await new Promise((r) => setTimeout(r, 20)); }throw new Error(`Timeout: ${nome}`); }
test("Admin e Perfil: clique real, contrato de aprovação e estatísticas da lista própria", { skip: !chromeDisponivel && "Chrome local ausente", timeout: 150000 }, async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "pnt-admin-profile-")), requests = [], pendentes = [];
  let db = [], modo = {}, usuarioAtual = owner, chrome, servidor;
  try {
    servidor = await createServer({ root, configFile: false, cacheDir: join(temp, "vite"), logLevel: "error", server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, plugins: [react(), {
      name: "admin-profile-synthetic-only", resolveId(id) { if (id === "/__integration.jsx") return "\0integration-test.jsx"; }, load(id) { if (id === "\0integration-test.jsx") return entrada; },
      configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
        const path = req.url.split("?")[0];
        if (path === "/__test") { res.setHeader("Content-Type", "text/html");res.setHeader("Set-Cookie", "synthetic=1; HttpOnly; Path=/; SameSite=Lax");res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__integration.jsx"></script></body></html>');return; }
        if (!path.startsWith("/trilhas") && !path.startsWith("/usuarios")) return next();
        let body = "";for await (const chunk of req) body += chunk.toString();const registro = { url: req.url, method: req.method, body, headers: req.headers };requests.push(registro);
        const json = (status, data) => { if (res.destroyed) return;res.statusCode = status;res.setHeader("Content-Type", "application/json");res.end(status === 204 ? undefined : JSON.stringify(data)); };
        if (path === "/trilhas/minhas") {
          const pessoa = usuarioAtual._id;
          const responder = () => modo.erroLista ? json(500, { mensagem: "Lista indisponível." }) : json(200, db.filter((p) => p.proprietario === pessoa));
          if (modo.holdLista) pendentes.push(responder);else responder();return;
        }
        if (path === "/trilhas/pendentes") { json(200, db.filter((p) => p.status === "pending"));return; }
        if (path === "/trilhas" && req.method === "GET") { json(200, db.filter((p) => p.status === "approved"));return; }
        const item = db.find((p) => p._id === path.split("/")[2]);
        if (!item) { json(404, { mensagem: "Não encontrada." });return; }
        if (path.endsWith("/moderacao")) {
          if (modo.falhaDecisao) { json(modo.falhaDecisao, { mensagem: "Decisão não autorizada." });return; }
          if (modo.respostaIncorreta) { json(200, { ...item, status: "pending" });return; }
          const decisao = JSON.parse(body);item.status = decisao.status;item.motivoRejeicao = decisao.motivo || null;json(200, item);return;
        }
        if (req.method === "DELETE") { db = db.filter((p) => p !== item);json(204);return; }
        if (path.endsWith("/reenviar")) { item.status = "pending";json(200, item);return; }
        json(404, { mensagem: "Endpoint não esperado." });
      }); },
    }] });
    await servidor.listen();const origem = `http://127.0.0.1:${servidor.httpServer.address().port}`;
    await (await fetch(origem + "/__test")).text();await (await fetch(origem + "/__integration.jsx")).text();chrome = await abrirChrome(join(temp, "chrome"));await chrome.navegar(origem + "/__test");await esperar(() => chrome.avaliar("typeof abrir==='function'"), "entrada");
    const texto = () => chrome.avaliar("document.getElementById('root').textContent");
    const abrir = async (pagina, user = owner) => { usuarioAtual = user;await chrome.avaliar(`abrir(${JSON.stringify(pagina)},${JSON.stringify(user)})`);await esperar(() => chrome.avaliar("Boolean(document.querySelector('main'))"), "montagem"); };
    const clicar = (rotulo, seletor = "#root") => chrome.avaliar(`(()=>{const el=[...document.querySelector(${JSON.stringify(seletor)}).querySelectorAll('button,a')].find(b=>b.textContent===${JSON.stringify(rotulo)});if(!el)throw new Error('Controle ausente');el.click();})()`);
    async function ponteiro(rotulo) {
      const ponto = await chrome.avaliar(`(async()=>{const el=[...document.querySelectorAll('.adminDecisionButtons button')].find(b=>b.textContent===${JSON.stringify(rotulo)});el.scrollIntoView({block:'center'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const box=el.getBoundingClientRect();const x=box.left+box.width/2,y=box.top+box.height/2;return {x,y,livre:el.contains(document.elementFromPoint(x,y)),disabled:el.disabled};})()`);
      assert.equal(ponto.livre, true);assert.equal(ponto.disabled, false);await chrome.clicarEm(ponto.x, ponto.y);
    }
    const contagens = () => chrome.avaliar("({publicadas:document.querySelector('[data-contagem=publicadas]')?.textContent,aprovadas:document.querySelector('[data-contagem=aprovadas]')?.textContent})");
    const esperarContagens = (publicadas, aprovadas) => esperar(async () => { const c = await contagens();return c.publicadas === String(publicadas) && c.aprovadas === String(aprovadas); }, "contagens atuais");
    t.afterEach(async () => { await chrome.avaliar("ocultar()");await esperar(() => chrome.avaliar("document.querySelector('main')===null"), "desmontagem");pendentes.splice(0).forEach((fn) => fn());requests.length = 0;modo = {}; });

    await t.test("aprova por clique real com motivo vazio, envia corpo exato e disponibiliza no GET público", async () => {
      for (const width of [1280, 390]) {
        db = [post(width)];await chrome.viewport(width, 1000);await abrir("/admin", admin);await esperar(() => chrome.avaliar("document.querySelectorAll('.adminPostCard').length===1"), "fila");
        assert.equal(await chrome.avaliar("document.querySelector('.adminRejectionForm textarea').value"), "");await ponteiro("Aprovar");
        await esperar(async () => (await texto()).includes("Publicação aprovada."), "confirmação");assert.equal(await chrome.avaliar("document.querySelectorAll('.adminPostCard').length"), 0);
        const request = requests.filter((r) => r.method === "POST").at(-1);assert.equal(request.url, `/trilhas/${id(width)}/moderacao`);assert.deepEqual(JSON.parse(request.body), { status: "approved" });assert.equal(request.headers["x-csrf-token"], "csrf-sintetico");assert.match(request.headers.cookie, /synthetic=1/);
        const feed = await chrome.avaliar("consultarFeed()");assert.equal(feed[0]._id, id(width));assert.equal(feed[0].status, "approved");
      }
      await abrir("/perfil");await esperarContagens(1, 1);assert.match(await texto(), /Verde/);assert.match(await texto(), /1 trilha aprovada/);
    });
    await t.test("rejeição continua exigindo motivo e mantém contrato separado da aprovação", async () => {
      db = [post(1)];await abrir("/admin", admin);await esperar(() => chrome.avaliar("Boolean(document.querySelector('.adminPostCard'))"), "fila");
      await ponteiro("Rejeitar");assert.equal(requests.filter((r) => r.method === "POST").length, 0);
      await chrome.avaliar("(()=>{const el=document.querySelector('.adminDecision textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'  Corrigir localização.  ');el.dispatchEvent(new Event('input',{bubbles:true}));})()");await ponteiro("Rejeitar");await esperar(async () => (await texto()).includes("Publicação rejeitada."), "rejeição");assert.deepEqual(JSON.parse(requests.find((r) => r.method === "POST").body), { status: "rejected", motivo: "Corrigir localização." });
    });
    await t.test("erro e resposta sem decisão confirmada não removem publicação nem anunciam sucesso", async () => {
      db = [post(1)];modo.falhaDecisao = 403;await abrir("/admin", admin);await esperar(() => chrome.avaliar("Boolean(document.querySelector('.adminPostCard'))"), "fila");await ponteiro("Aprovar");await esperar(async () => (await texto()).includes("Decisão não autorizada"), "erro HTTP");
      modo = { respostaIncorreta: true };await ponteiro("Aprovar");await esperar(async () => (await texto()).includes("A API não confirmou"), "resposta inválida");assert.equal(await chrome.avaliar("document.querySelectorAll('.adminPostCard').length"), 1);assert.doesNotMatch(await texto(), /Publicação aprovada\./);
    });
    await t.test("Perfil usa uma única lista completa, sem campo de contagem no usuário", async () => {
      db = [post(1), post(2, "rejected"), post(3, "approved"), post(4, "approved"), { ...post(5, "approved"), proprietario: id(777) }];await abrir("/perfil");await esperarContagens(4, 2);assert.match(await texto(), /2 trilhas aprovadas/);assert.match(await texto(), /Verde/);assert.match(await texto(), /Nível 2 de 5/);
      assert.equal(requests.filter((r) => r.url === "/trilhas/minhas").length, 1);assert.equal(requests.some((r) => r.url === "/trilhas"), false);
    });
    await t.test("reenvio, exclusão e atualização manual atualizam indicadores e nível", async () => {
      db = [post(1, "rejected"), post(2, "approved")];await abrir("/perfil");await esperarContagens(2, 1);
      await clicar("Reenviar para aprovação");await esperar(() => chrome.avaliar("document.querySelector('.profilePostStatus')?.dataset.status==='pending'"), "reenvio");await esperarContagens(2, 1);
      await clicar("Excluir publicação", `[data-publicacao-id="${id(2)}"]`);await esperarContagens(1, 0);assert.match(await texto(), /Transparente/);assert.match(await texto(), /0 trilhas aprovadas/);
      db[0].status = "approved";await clicar("Atualizar publicações");await esperarContagens(1, 1);assert.match(await texto(), /Verde/);
      await clicar("Excluir publicação");await esperarContagens(0, 0);assert.match(await texto(), /Nenhuma publicação ainda/);
    });
    await t.test("zero real, carregamento e erro da API são estados distintos; erro não atribui medalha", async () => {
      db = [];modo.holdLista = true;await abrir("/perfil");await esperar(() => pendentes.length === 1, "consulta retida");assert.deepEqual(await contagens(), { publicadas: "—", aprovadas: "—" });assert.match(await texto(), /Carregando sua medalha/);
      pendentes.shift()();await esperarContagens(0, 0);assert.match(await texto(), /Transparente/);
      modo = { erroLista: true };await abrir("/perfil");await esperar(async () => (await texto()).includes("Lista indisponível"), "erro");assert.deepEqual(await contagens(), { publicadas: "—", aprovadas: "—" });assert.doesNotMatch(await texto(), /Transparente|Verde/);
    });
    await t.test("troca de conta não mostra contagens anteriores enquanto espera nova consulta", async () => {
      db = [post(1, "approved")];await abrir("/perfil");await esperarContagens(1, 1);modo.holdLista = true;await abrir("/perfil", { ...owner, _id: id(777) });await esperar(() => pendentes.length === 1, "nova lista");assert.deepEqual(await contagens(), { publicadas: "—", aprovadas: "—" });pendentes.shift()();await esperarContagens(0, 0);
    });
  } finally { pendentes.splice(0).forEach((fn) => fn());try { await chrome?.fechar(); } finally { try { await servidor?.close(); } finally { await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } } }
});
