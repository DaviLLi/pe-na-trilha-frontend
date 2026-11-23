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
const usuario = { _id: id(99), perfil: "user", nomeCompleto: "Pessoa sintética" };
const foto = (p, f) => ({ _id: id(f), url: `/trilhas/minhas/${id(p)}/fotos/${id(f)}/conteudo`, updatedAt: "2026-11-13T12:00:00.000Z" });
const post = (n, status, fotos = []) => ({ _id: id(n), proprietario: usuario._id, status, titulo: `Publicação ${n}`, descricao: "Descrição inicial", endereco: "Local inicial", tipoLocal: "Trilha", banheiro: "Sim", caracteristicaPrincipal: "Rio", duracao: { horas: 1, minutos: 0 }, fotos, ...(status === "rejected" ? { motivoRejeicao: "Corrigir localização.", historicoModeracao: [{ acao: "rejected" }] } : {}) });
const entrada = `
import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route} from 'react-router-dom';
import AuthContext from '/src/contexts/authContextValue.js';import api,{definirTokenCsrf} from '/src/services/api.js';
import ListaTrilhas from '/src/pages/ListaTrilhas.jsx';import CadastroTrilha from '/src/pages/CadastroTrilha.jsx';import Perfil from '/src/pages/Perfil.jsx';import EditarTrilha from '/src/pages/EditarTrilha.jsx';import '/src/styles/product.css';
import {criarEnviosPublicacao} from '/src/services/enviosPublicacao.js';
api.defaults.baseURL=location.origin;definirTokenCsrf('csrf-sintetico');
const root=createRoot(document.getElementById('root'));let seq=0;
window.abrir=(pagina,usuario)=>root.render(React.createElement(MemoryRouter,{initialEntries:[pagina],key:++seq},React.createElement(AuthContext.Provider,{value:{usuario,enviosPublicacao:usuario?criarEnviosPublicacao():null}},React.createElement(Routes,null,React.createElement(Route,{path:'/trilhas',element:React.createElement(ListaTrilhas)}),React.createElement(Route,{path:'/trilhas/nova',element:React.createElement(CadastroTrilha)}),React.createElement(Route,{path:'/perfil',element:React.createElement(Perfil)}),React.createElement(Route,{path:'/trilhas/:id/editar',element:React.createElement(EditarTrilha)})))));
window.ocultar=()=>root.render(null);window.confirma=true;window.confirm=()=>window.confirma;
window.urls={criadas:[],revogadas:[]};const criar=URL.createObjectURL.bind(URL),revogar=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=(blob)=>{const url=criar(blob);window.urls.criadas.push(url);return url;};URL.revokeObjectURL=(url)=>{window.urls.revogadas.push(url);return revogar(url);};
`;
async function esperar(fn, nome) {
  const fim = Date.now() + 10000;
  while (Date.now() < fim) { if (await fn()) return; await new Promise((r) => setTimeout(r, 20)); }
  throw new Error(`Timeout: ${nome}`);
}
test("Gerenciamento próprio real no navegador com API exclusivamente sintética", { skip: !chromeDisponivel && "Chrome local ausente", timeout: 150000 }, async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "pnt-owner-"));
  const requests = [], pendentes = [];
  let db = [], modo = {}, chrome, servidor, pixel, proximaFoto = 500;
  try {
    servidor = await createServer({ root, configFile: false, cacheDir: join(temp, "vite"), logLevel: "error", server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, plugins: [react(), {
      name: "owner-synthetic-only", resolveId(id) { if (id === "/__owner.jsx") return "\0owner-test.jsx"; }, load(id) { if (id === "\0owner-test.jsx") return entrada; },
      configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
        const path = req.url.split("?")[0];
        if (path === "/__test") { res.setHeader("Content-Type", "text/html");res.setHeader("Set-Cookie", "synthetic=1; HttpOnly; Path=/; SameSite=Lax");res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/__owner.jsx"></script></body></html>');return; }
        if (!path.startsWith("/trilhas") && !path.startsWith("/usuarios")) return next();
        let body = "";for await (const chunk of req) body += chunk.toString();
        const request = { url: req.url, method: req.method, body, headers: req.headers };requests.push(request);
        const json = (status, data) => { if (res.destroyed) return;res.statusCode = status;res.setHeader("Content-Type", "application/json");res.end(status === 204 ? undefined : JSON.stringify(data)); };
        if (path.endsWith("/conteudo")) { if (!res.destroyed) { res.setHeader("Content-Type", "image/webp");res.end(pixel); }return; }
        if (path === "/trilhas" && req.method === "GET") { json(200, db.filter((p) => p.status === "approved").map((p) => ({ ...p, fotos: p.fotos.map((f) => ({ ...f, url: f.url.replace("/trilhas/minhas/", "/trilhas/") })) })));return; }
        if (path === "/trilhas/minhas") { json(200, db);return; }
        if (path.startsWith("/trilhas/minhas/")) { if (modo.falhaConsulta) { json(500, { mensagem: "Consulta indisponível." });return; }const item = db.find((p) => p._id === path.split("/")[3]);json(item ? 200 : 404, item || { mensagem: "Publicação não encontrada." });return; }
        const partes = path.split("/"), item = db.find((p) => p._id === partes[2]);
        const responder = () => {
          if (res.destroyed) return;
          if (modo.falha) { json(modo.falha, { mensagem: `Operação recusada ${modo.falha}.` });return; }
          if (!item) { json(404, { mensagem: "Publicação não encontrada." });return; }
          if (modo.aprovarAntes) item.status = "approved";
          if (partes[3] === "reenviar") { if (item.status !== "rejected") { json(409, { mensagem: "Somente rejeitadas." });return; }item.status = "pending";json(200, item);return; }
          if (partes[3] === "fotos") {
            if (item.status === "approved") { json(403, { mensagem: "Fotos aprovadas bloqueadas." });return; }
            const indice = item.fotos.findIndex((f) => f._id === partes[4]);
            if (req.method === "POST") { const f = foto(Number.parseInt(item._id, 16), proximaFoto++);item.fotos.push(f);json(201, f); }
            else if (req.method === "PUT") { const f = item.fotos[indice];json(200, f); }
            else { item.fotos.splice(indice, 1);json(204); }return;
          }
          if (req.method === "DELETE") { db = db.filter((p) => p !== item);json(204);return; }
          const data = JSON.parse(body);
          if (item.status === "approved" && ["titulo", "descricao", "endereco", "fotos"].some((k) => Object.hasOwn(data, k))) { json(403, { mensagem: "Campos bloqueados." });return; }
          Object.assign(item, data);json(200, item);
        };
        if (modo.hold) pendentes.push(responder);else responder();
      }); },
    }] });
    await servidor.listen();const origem = `http://127.0.0.1:${servidor.httpServer.address().port}`;
    await (await fetch(origem + "/__test")).text();await (await fetch(origem + "/__owner.jsx")).text();
    chrome = await abrirChrome(join(temp, "chrome"));await chrome.navegar(origem + "/__test");await esperar(() => chrome.avaliar("typeof abrir==='function'"), "entrada");
    pixel = Buffer.from(await chrome.avaliar("(()=>{const c=document.createElement('canvas');c.width=c.height=1;return c.toDataURL('image/webp').split(',')[1];})()"), "base64");
    const texto = () => chrome.avaliar("document.getElementById('root').textContent");
    const abrir = async (pagina = "/perfil", user = usuario) => { await chrome.avaliar(`abrir(${JSON.stringify(pagina)},${JSON.stringify(user)})`);await esperar(() => chrome.avaliar("Boolean(document.querySelector('main'))"), "montagem"); };
    const editor = async (n) => { await abrir(`/trilhas/${id(n)}/editar`);await esperar(() => chrome.avaliar("Boolean(document.querySelector('.trilhaForm'))"), "formulário privado"); };
    const clicar = (rotulo, seletor = "#root") => chrome.avaliar(`(()=>{const el=[...document.querySelector(${JSON.stringify(seletor)}).querySelectorAll('button,a')].find(el=>el.textContent===${JSON.stringify(rotulo)});if(!el)throw new Error('Controle ausente');el.click();})()`);
    const escrever = (campo, valor) => chrome.avaliar(`(()=>{const el=document.getElementById(${JSON.stringify(campo)});Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(valor)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const selecionar = (seletor) => chrome.avaliar(`(()=>{const dt=new DataTransfer();dt.items.add(new File([new Uint8Array([137,80,78,71])],'sintetica.png',{type:'image/png'}));const el=document.querySelector(${JSON.stringify(seletor)});el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const atualizada = () => esperar(() => chrome.avaliar("document.querySelector('.ownerPublicationEditor .formCard')?.getAttribute('aria-busy')==='false'"), "reconciliação");
    const mutacoes = () => requests.filter((r) => r.method !== "GET");
    t.afterEach(async () => { await chrome.avaliar("ocultar()");await esperar(() => chrome.avaliar("document.querySelector('main')===null"), "desmontagem");pendentes.splice(0).forEach((fn) => fn());modo = {};requests.length = 0;await chrome.avaliar("window.confirma=true"); });

    await t.test("perfil vazio navega ao formulário em desktop e celular", async () => {
      db = [];
      for (const largura of [1280, 390]) {
        await chrome.viewport(largura);await abrir();
        await esperar(() => chrome.avaliar("Boolean(document.querySelector('[aria-label=\"Adicionar publicação\"]'))"), "adicionar");
        await chrome.avaliar("document.querySelector('[aria-label=\"Adicionar publicação\"]').click()");
        await esperar(() => chrome.avaliar("Boolean(document.querySelector('.trilhaForm'))"), "formulário novo");
      }
    });
    await t.test("Feed sem controles de gestão para proprietário, terceiro e admin em desktop e celular", async () => {
      db = [post(1, "approved"), { ...post(2, "approved"), proprietario: id(88) }];
      for (const largura of [1280, 390]) for (const user of [usuario, { ...usuario, perfil: "admin" }]) {
        await chrome.viewport(largura);await abrir("/trilhas", user);
        await esperar(() => chrome.avaliar("document.querySelectorAll('.post').length===2"), "Feed");
        assert.equal(await chrome.avaliar("document.querySelectorAll('.post .editBtn,.post .deleteBtn,.post .actionButtons,.post a[href$=\"/editar\"]').length"), 0);
        assert.equal(mutacoes().length, 0);
        await abrir("/perfil", user);await esperar(() => chrome.avaliar("document.querySelectorAll('.profilePostCard').length===2"), "Perfil");
        assert.equal(await chrome.avaliar("document.querySelectorAll('.ownerEditButton').length"), 1);
        assert.equal(await chrome.avaliar("document.querySelectorAll('.ownerDeleteButton').length"), 1);
        await clicar("Editar publicação");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.trilhaForm'))"), "edição pelo Perfil");
      }
    });
    await t.test("exclusão pelo Perfil com e sem fotos persiste ao remontar Perfil e Feed", async () => {
      for (const comFotos of [false, true]) {
        db = [post(1, "approved", comFotos ? [foto(1, 10), foto(1, 11)] : []), { ...post(2, "approved"), proprietario: id(88) }];
        await abrir("/perfil");
        const seletor = ".ownerDeleteButton";
        await esperar(() => chrome.avaliar(`Boolean(document.querySelector('${seletor}'))`), "excluir disponível");
        assert.equal(await chrome.avaliar(`document.querySelectorAll('${seletor}').length`), 1);
        await chrome.avaliar(`document.querySelector('${seletor}').click()`);
        await esperar(() => db.length === 1, "exclusão recebida");
        await esperar(async () => !(await texto()).includes("Publicação 1"), "lista reconciliada");
        for (const destino of ["/trilhas", "/perfil"]) {
          await abrir(destino);await esperar(() => chrome.avaliar("!document.getElementById('root').textContent.includes('Carregando')"), "consulta nova");
          assert.doesNotMatch(await texto(), /Publicação 1/);
          assert.match(await texto(), /Publicação 2/);
        }
      }
    });
    await t.test("Perfil apresenta ações por estado e impede edição de registros de terceiros", async () => {
      db = [post(1, "pending"), post(2, "rejected"), post(3, "approved"), { ...post(4, "pending"), proprietario: id(88) }];await abrir();
      await esperar(() => chrome.avaliar("document.querySelectorAll('.profilePostCard').length===4"), "lista");
      assert.equal(await chrome.avaliar("[...document.querySelectorAll('button')].filter(b=>b.textContent==='Reenviar para aprovação').length"), 1);
      assert.equal(await chrome.avaliar(`document.querySelector('[data-publicacao-id="${id(4)}"] .ownerPublicationActions').children.length`), 0);
      await clicar("Corrigir publicação");await esperar(() => chrome.avaliar("document.getElementById('titulo')?.value==='Publicação 2'"), "detalhes próprios");
      assert.match(await texto(), /Corrigir localização/);assert.ok(requests.some((r) => r.url === `/trilhas/minhas/${id(2)}`));
      assert.equal(requests.some((r) => r.url === `/trilhas/${id(2)}`), false);
      assert.equal(await chrome.avaliar("document.getElementById('resposta-banheiro-0').checked"), true);
      assert.equal(await chrome.avaliar("document.querySelector('output[aria-label=Horas]').textContent"), "01");
    });
    await t.test("corrigir rejected preserva rejeição e motivo; reenvio explícito usa {} e atualiza Perfil", async () => {
      db = [post(2, "rejected")];await editor(2);await escrever("titulo", "Título corrigido");await clicar("Salvar alterações");
      await esperar(async () => (await texto()).includes("Alterações salvas"), "salvar");await atualizada();
      assert.equal(db[0].status, "rejected");assert.equal(db[0].motivoRejeicao, "Corrigir localização.");
      assert.deepEqual(JSON.parse(mutacoes()[0].body), { titulo: "Título corrigido" });
      await clicar("Voltar ao Perfil");await esperar(async () => (await texto()).includes("Título corrigido"), "Perfil atualizado");
      modo.hold = true;await clicar("Reenviar para aprovação");await esperar(() => pendentes.length === 1, "reenvio");
      assert.equal(await chrome.avaliar("[...document.querySelectorAll('.ownerPublicationActions button')].every(b=>b.disabled)"), true);
      pendentes.shift()();await esperar(() => chrome.avaliar("document.querySelector('.profilePostStatus')?.dataset.status==='pending'"), "estado pendente");
      assert.equal(db[0].status, "pending");assert.deepEqual(JSON.parse(mutacoes().at(-1).body), {});assert.match(await texto(), /reenviada para aprovação/);
      assert.match(await texto(), /Corrigir localização/);
    });
    await t.test("approved bloqueia básicos e fotos, enviando somente características e duração", async () => {
      db = [post(3, "approved", [foto(3, 30)])];await editor(3);
      for (const campo of ["titulo", "descricao", "endereco"]) assert.equal(await chrome.avaliar(`document.getElementById('${campo}').disabled`), true);
      assert.equal(await chrome.avaliar("document.querySelectorAll('.ownerPhotoManager input,.ownerPhotoManager button').length"), 0);
      await chrome.avaliar("document.querySelector('[aria-label=\"Limpar resposta: Banheiro\"]').click();document.querySelector('[aria-label=\"Aumentar minutos\"]').click();true");
      await clicar("Salvar alterações");await esperar(async () => (await texto()).includes("Alterações salvas"), "salvar aprovada");await atualizada();
      assert.deepEqual(JSON.parse(mutacoes()[0].body), { banheiro: null, duracao: { horas: 1, minutos: 1 } });assert.equal(db[0].status, "approved");
      assert.equal(db[0].titulo, "Publicação 3");
    });
    await t.test("pending adiciona, substitui e remove fotos, reconcilia e revoga Blob mesmo com updatedAt igual", async () => {
      db = [post(1, "pending", [foto(1, 10)])];await editor(1);
      await esperar(() => chrome.avaliar("document.querySelectorAll('.ownerPhotoManager img').length===1"), "foto inicial");
      const antiga = await chrome.avaliar("document.querySelector('.ownerPhotoManager img').src");
      await selecionar('input[aria-label="Substituir foto"]');await clicar("Substituir foto", ".ownerPhotoManager");
      await esperar(async () => (await texto()).includes("Foto substituída"), "substituição");await atualizada();
      await esperar(() => chrome.avaliar(`window.urls.revogadas.includes(${JSON.stringify(antiga)})`), "revogação Blob anterior");
      await selecionar('input[aria-label="Adicionar foto"]');await clicar("Adicionar foto", ".ownerPhotoManager");
      await esperar(async () => (await texto()).includes("Foto adicionada"), "adição");await atualizada();assert.equal(db[0].fotos.length, 2);
      const put = mutacoes().find((r) => r.method === "PUT");assert.equal(put.url, `/trilhas/${id(1)}/fotos/${id(10)}`);assert.match(put.headers["content-type"], /^multipart\/form-data; boundary=/);assert.match(put.body, /name="imagem"/);assert.equal(put.headers["x-csrf-token"], "csrf-sintetico");
      await chrome.avaliar("window.confirma=false");const antes = mutacoes().length;await clicar("Remover foto", ".ownerPhotoManager");assert.equal(mutacoes().length, antes);
      await chrome.avaliar("window.confirma=true");await clicar("Remover foto", ".ownerPhotoManager");await esperar(async () => (await texto()).includes("Foto removida"), "remoção");await atualizada();assert.equal(db[0].fotos.length, 1);
      await clicar("Voltar ao Perfil");await esperar(() => chrome.avaliar("document.querySelectorAll('.profilePostCard').length===1"), "Perfil após fotos");assert.equal(await chrome.avaliar("document.querySelectorAll('.profilePostPhotos figure').length"), 1);
    });
    await t.test("cinco fotos bloqueiam adição, mantendo substituição e remoção em rejected", async () => {
      db = [post(2, "rejected", [10, 11, 12, 13, 14].map((f) => foto(2, f)))];await editor(2);
      assert.equal(await chrome.avaliar("document.querySelectorAll('input[aria-label=\"Adicionar foto\"]').length"), 0);assert.match(await texto(), /Limite de cinco fotos/);
      assert.equal(await chrome.avaliar("document.querySelectorAll('input[aria-label=\"Substituir foto\"]').length"), 5);
    });
    await t.test("exclusão exige confirmação e retira publicação do Perfil sem recarregar página", async () => {
      db = [post(3, "approved")];await abrir();await esperar(() => chrome.avaliar("document.querySelectorAll('.profilePostCard').length===1"), "lista");
      await chrome.avaliar("window.confirma=false");await clicar("Excluir publicação");assert.equal(mutacoes().length, 0);
      await chrome.avaliar("window.confirma=true");await clicar("Excluir publicação");await esperar(async () => (await texto()).includes("Nenhuma publicação ainda"), "lista vazia");
      assert.match(await texto(), /Publicação excluída/);assert.equal(mutacoes()[0].method, "DELETE");assert.equal(mutacoes()[0].url, `/trilhas/${id(3)}`);
    });
    await t.test("erro HTTP preserva mensagem e dados; aprovação concorrente bloqueia fotos após reconciliação", async () => {
      for (const status of [403, 409, 500]) {
        db = [post(1, "pending")];modo = { falha: status };await editor(1);await escrever("descricao", "Correção não salva");await clicar("Salvar alterações");
        await esperar(async () => (await texto()).includes(`Operação recusada ${status}`), "erro API");await atualizada();
        assert.equal(db[0].descricao, "Descrição inicial");assert.equal(await chrome.avaliar("document.getElementById('descricao').value"), "Correção não salva");
      }
      modo = { aprovarAntes: true };await selecionar('input[aria-label="Adicionar foto"]');await clicar("Adicionar foto", ".ownerPhotoManager");
      await esperar(async () => (await texto()).includes("Fotos aprovadas bloqueadas"), "aprovação concorrente");await atualizada();
      assert.equal(await chrome.avaliar("document.querySelectorAll('.ownerPhotoManager input').length"), 0);assert.equal(db[0].fotos.length, 0);
    });
    await t.test("falha na reconciliação bloqueia operações até atualização manual e não repete upload", async () => {
      db = [post(1, "pending")];await editor(1);modo.falhaConsulta = true;await selecionar('input[aria-label="Adicionar foto"]');await clicar("Adicionar foto", ".ownerPhotoManager");
      await esperar(async () => (await texto()).includes("Não foi possível confirmar o estado atual"), "consulta falhou");
      assert.equal(db[0].fotos.length, 1);assert.equal(await chrome.avaliar("document.querySelector('.trilhaForm button[type=submit]').disabled"), true);
      modo.falhaConsulta = false;await clicar("Atualizar publicação");await atualizada();assert.equal(mutacoes().length, 1);
    });
    await t.test("terceiro/admin não edita; desmontagem cancela mutação sem consulta tardia", async () => {
      db = [post(1, "pending")];await abrir(`/trilhas/${id(1)}/editar`, { _id: id(88), perfil: "admin" });
      await esperar(async () => (await texto()).includes("A edição não está disponível"), "terceiro negado");assert.equal(await chrome.avaliar("document.querySelector('form')===null"), true);
      await editor(1);modo.hold = true;await escrever("titulo", "Alteração tardia");await clicar("Salvar alterações");await esperar(() => pendentes.length === 1, "POST retido");
      await chrome.avaliar("ocultar()");await esperar(() => chrome.avaliar("document.querySelector('main')===null"), "desmontagem");const antes = requests.length;pendentes.shift()();await chrome.avaliar("new Promise(r=>setTimeout(r,100))");assert.equal(requests.length, antes);
    });
  } finally {
    pendentes.splice(0).forEach((fn) => fn());try { await chrome?.fechar(); } finally { try { await servidor?.close(); } finally { await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } }
  }
});
