import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
import process from "node:process";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { abrirChrome, chromeDisponivel } from "./helpers/chrome.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const id = "000000000000000000000001";
const usuarioInicial = { _id: id, nomeCompleto: "Pessoa da Trilha", nomeUsuario: "pessoa", email: "pessoa@example.invalid", perfil: "user", fotoPerfil: null };
const entrada = `
import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {AuthProvider} from '/src/contexts/AuthContext.jsx';import {useAuth} from '/src/contexts/useAuth.js';
import api from '/src/services/api.js';import CadastroTrilha from '/src/pages/CadastroTrilha.jsx';import Perfil from '/src/pages/Perfil.jsx';
import '/src/styles/style.css';import '/src/styles/community.css';
api.defaults.baseURL=location.origin;
function Sair(){const {logout}=useAuth();return React.createElement('button',{onClick:logout,id:'sair-teste'},'Sair da sessão sintética');}
const root=createRoot(document.getElementById('root'));let seq=0;
window.abrir=(pagina)=>root.render(React.createElement(MemoryRouter,{initialEntries:[pagina],key:++seq},React.createElement(AuthProvider,null,React.createElement(Sair),React.createElement(Routes,null,React.createElement(Route,{path:'/perfil',element:React.createElement(Perfil)}),React.createElement(Route,{path:'/nova',element:React.createElement(CadastroTrilha)})))));
window.ocultar=()=>root.render(null);window.confirma=true;window.confirm=()=>window.confirma;
const criar=URL.createObjectURL.bind(URL),revogar=URL.revokeObjectURL.bind(URL);window.urls={criadas:[],revogadas:[]};
URL.createObjectURL=(file)=>{const url=criar(file);window.urls.criadas.push(url);return url;};URL.revokeObjectURL=(url)=>{window.urls.revogadas.push(url);return revogar(url);};
`;
async function esperar(fn, nome) { const fim = Date.now() + 10000; while (Date.now() < fim) { if (await fn()) return; await new Promise((r) => setTimeout(r, 20)); } throw new Error(`Timeout: ${nome}`); }
test("Usabilidade: seleção acumulada, prévias, Perfil e ações responsivas no Chrome", { skip: !chromeDisponivel && "Chrome local ausente", timeout: 150000 }, async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "pnt-ui-")); const requests = [], pendentes = [];
  let usuario = { ...usuarioInicial }, modo = {}, publicacoes = [], servidor, chrome;
  try {
    servidor = await createServer({ root, configFile: false, cacheDir: join(temp, "vite"), logLevel: "error", server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, plugins: [react(), {
      name: "ui-synthetic-only", resolveId(id) { if (id === "/__ui.jsx") return "\0ui-test.jsx"; }, load(id) { if (id === "\0ui-test.jsx") return entrada; },
      configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
        if (req.url === "/__test") { res.setHeader("Content-Type", "text/html");res.setHeader("Set-Cookie", "synthetic=1; HttpOnly; Path=/; SameSite=Lax");res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__ui.jsx"></script></body></html>');return; }
        if (!req.url.startsWith("/usuarios") && !req.url.startsWith("/trilhas")) return next();
        let body = "";for await (const chunk of req) body += chunk.toString();const registro = { url: req.url, method: req.method, body, headers: req.headers };requests.push(registro);
        const json = (status, data) => { if (res.destroyed) return;res.statusCode = status;res.setHeader("Content-Type", "application/json");res.end(status === 204 ? undefined : JSON.stringify(data)); };
        if (req.url === "/usuarios/refresh") { json(200, { usuario });return; }
        if (req.url === "/usuarios/csrf") { json(200, { csrfToken: "csrf-sintetico" });return; }
        if (req.url === "/usuarios/logout") { json(204);return; }
        if (req.url === "/usuarios/me" && req.method === "PATCH") {
          const responder = () => { if (res.destroyed) return;if (modo.falha) { json(modo.falha, { mensagem: "E-mail já cadastrado." });return; }const data = JSON.parse(body);usuario = { ...usuario, ...data };json(200, usuario); };
          if (modo.hold) pendentes.push(responder);else responder();return;
        }
        if (req.url === "/trilhas/minhas") { json(200, publicacoes);return; }
        if (req.method === "DELETE") { publicacoes = [];json(204);return; }
        json(404, { mensagem: "Endpoint inesperado pelo teste." });
      }); },
    }] });
    await servidor.listen();const origem = `http://127.0.0.1:${servidor.httpServer.address().port}`;
    await (await fetch(origem + "/__test")).text();await (await fetch(origem + "/__ui.jsx")).text();
    chrome = await abrirChrome(join(temp, "chrome"));await chrome.navegar(origem + "/__test");await esperar(() => chrome.avaliar("typeof abrir==='function'"), "entrada");
    await chrome.avaliar("(()=>{const c=document.createElement('canvas');c.width=120;c.height=90;const x=c.getContext('2d');x.fillStyle='#286d5e';x.fillRect(0,0,120,90);x.fillStyle='#80d8b6';x.fillRect(10,10,60,50);window.png=c.toDataURL('image/png').split(',')[1];})()");
    const texto = () => chrome.avaliar("document.getElementById('root').textContent");
    const abrir = async (pagina) => { await chrome.avaliar(`abrir(${JSON.stringify(pagina)})`);await esperar(() => chrome.avaliar(pagina === "/nova" ? "Boolean(document.getElementById('fotos-publicacao'))" : "document.getElementById('profile-name')?.textContent!=='Nome não informado' && Boolean(document.getElementById('profile-name'))"), "sessão e página"); };
    const clicar = (rotulo) => chrome.avaliar(`(()=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(rotulo)});if(!el)throw new Error('Botão ausente');el.click();})()`);
    const selecionar = (nomes, tipo = "image/png") => chrome.avaliar(`(()=>{const dt=new DataTransfer();for(const nome of ${JSON.stringify(nomes)})dt.items.add(new File([Uint8Array.from(atob(window.png),c=>c.charCodeAt(0))],nome,{type:${JSON.stringify(tipo)}}));const el=document.getElementById('fotos-publicacao');el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const escrever = (campo, valor) => chrome.avaliar(`(()=>{const el=document.getElementById('perfil-'+${JSON.stringify(campo)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(valor)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const mutacoes = () => requests.filter((r) => r.method === "PATCH" || r.method === "DELETE");
    async function capturar(nome) {
      if (process.env.PNT_VISUAL_CAPTURE_DIR) await writeFile(join(process.env.PNT_VISUAL_CAPTURE_DIR, nome + ".png"), Buffer.from((await chrome.capturar()).data, "base64"));
    }
    t.afterEach(async () => { await chrome.avaliar("ocultar()");await esperar(() => chrome.avaliar("document.querySelector('main')===null"), "desmontagem");pendentes.splice(0).forEach((fn) => fn());requests.length = 0;modo = {};usuario = { ...usuarioInicial };publicacoes = [];await chrome.avaliar("window.confirma=true"); });

    await t.test("adiciona fotos em etapas, mantém ordem, miniaturas e remove individualmente sem upload", async () => {
      await abrir("/nova");await selecionar(["primeira.png", "segunda.png"]);await selecionar(["terceira.png"]);
      await esperar(() => chrome.avaliar("document.querySelectorAll('.selectedPhoto img').length===3"), "três prévias");
      assert.deepEqual(await chrome.avaliar("[...document.querySelectorAll('.selectedPhoto figcaption')].map(el=>el.textContent)"), ["primeira.png", "segunda.png", "terceira.png"]);
      await esperar(() => chrome.avaliar("[...document.querySelectorAll('.selectedPhoto img')].every(el=>el.complete&&el.naturalWidth===120)"), "decodificação local real");
      const anterior = await chrome.avaliar("document.querySelectorAll('.selectedPhoto img')[1].src");
      await chrome.avaliar("document.querySelector('[aria-label=\"Remover segunda.png\"]').click();true");
      await esperar(() => chrome.avaliar("document.querySelectorAll('.selectedPhoto').length===2"), "remoção");
      assert.equal(await chrome.avaliar(`window.urls.revogadas.includes(${JSON.stringify(anterior)})`), true);
      assert.deepEqual(await chrome.avaliar("[...document.querySelectorAll('.selectedPhoto figcaption')].map(el=>el.textContent)"), ["primeira.png", "terceira.png"]);
      assert.equal(requests.filter((r) => r.url.startsWith("/trilhas")).length, 0);
      await chrome.viewport(1280, 1000);await chrome.avaliar("document.querySelector('.publicationPhotos').scrollIntoView({block:'center'});true");await capturar("selecao-desktop");
      assert.ok(await chrome.avaliar("document.querySelector('.selectedPhoto').getBoundingClientRect().width<190"));
      await chrome.viewport(320, 1000);await chrome.avaliar("document.querySelector('.publicationPhotos').scrollIntoView({block:'center'});true");
      assert.equal(await chrome.avaliar("document.documentElement.scrollWidth>innerWidth"), false);await capturar("selecao-mobile");
    });
    await t.test("limite acumulado não apaga seleção anterior; remover libera uma vaga", async () => {
      await abrir("/nova");await selecionar(["1.png", "2.png", "3.png", "4.png"]);await selecionar(["5.png", "6.png"]);
      await esperar(async () => (await texto()).includes("Selecione até cinco"), "excesso");assert.equal(await chrome.avaliar("document.querySelectorAll('.selectedPhoto').length"), 4);
      await selecionar(["5.png"]);await esperar(() => chrome.avaliar("document.getElementById('fotos-publicacao').disabled"), "limite atingido");
      assert.match(await texto(), /Cinco fotos selecionadas/);await chrome.avaliar("document.querySelector('[aria-label=\"Remover 3.png\"]').click();true");
      await esperar(() => chrome.avaliar("!document.getElementById('fotos-publicacao').disabled"), "vaga liberada");
      await selecionar(["6.png"]);assert.equal(await chrome.avaliar("document.querySelectorAll('.selectedPhoto').length"), 5);
    });
    await t.test("cancelar seletor e tentar arquivo inválido preserva fotos; desmontagem revoga todas as prévias", async () => {
      await abrir("/nova");await selecionar(["valida.png"]);await selecionar([]);await selecionar(["nao.svg"], "image/svg+xml");
      await esperar(async () => (await texto()).includes("Use fotos JPEG"), "erro MIME");assert.equal(await chrome.avaliar("document.querySelectorAll('.selectedPhoto').length"), 1);
      await chrome.avaliar("ocultar()");await esperar(() => chrome.avaliar("document.querySelector('main')===null"), "desmontagem");
      const urls = await chrome.avaliar("window.urls");assert.deepEqual([...urls.criadas].sort(), [...urls.revogadas].sort());
    });
    await t.test("editar perfil usa endpoint existente e atualiza cabeçalho, identificador e e-mail pela sessão real", async () => {
      await abrir("/perfil");await clicar("Editar perfil");await esperar(() => chrome.avaliar("Boolean(document.getElementById('perfil-nomeCompleto'))"), "formulário");
      await escrever("nomeCompleto", " Nova Pessoa ");await escrever("nomeUsuario", " Novapessoa ");await escrever("email", " NOVA@EXAMPLE.INVALID ");
      modo.hold = true;await chrome.avaliar("(()=>{const f=document.querySelector('.profileEditPanel form');f.requestSubmit();f.requestSubmit();})()");await esperar(() => pendentes.length === 1, "PATCH único");
      assert.equal(mutacoes().length, 1);const req = mutacoes()[0];assert.equal(req.url, "/usuarios/me");assert.equal(req.method, "PATCH");assert.equal(req.headers["x-csrf-token"], "csrf-sintetico");assert.match(req.headers.cookie, /synthetic=1/);
      assert.deepEqual(JSON.parse(req.body), { nomeCompleto: "Nova Pessoa", nomeUsuario: "novapessoa", email: "nova@example.invalid" });
      pendentes.shift()();await esperar(async () => (await texto()).includes("Perfil atualizado com sucesso"), "sucesso");assert.equal(await chrome.avaliar("document.getElementById('profile-name').textContent"), "Nova Pessoa");assert.match(await texto(), /@novapessoa/);assert.match(await texto(), /nova@example.invalid/);
    });
    await t.test("validação local e erro da API mantêm dados editáveis sem falsa confirmação", async () => {
      await abrir("/perfil");await clicar("Editar perfil");await escrever("nomeUsuario", "invalido123");await clicar("Salvar perfil");
      await esperar(async () => (await texto()).includes("Use somente letras"), "validação");assert.equal(mutacoes().length, 0);
      await escrever("nomeUsuario", "outrapessoa");modo.falha = 409;await clicar("Salvar perfil");await esperar(async () => (await texto()).includes("E-mail já cadastrado"), "erro API");
      assert.equal(await chrome.avaliar("document.getElementById('perfil-nomeUsuario').value"), "outrapessoa");assert.doesNotMatch(await texto(), /Perfil atualizado com sucesso/);assert.equal(await chrome.avaliar("document.getElementById('profile-name').textContent"), usuarioInicial.nomeCompleto);
    });
    await t.test("fechar edição cancela a operação sem aplicar resposta tardia", async () => {
      await abrir("/perfil");await clicar("Editar perfil");await escrever("nomeCompleto", "Resposta tardia");modo.hold = true;await clicar("Salvar perfil");await esperar(() => pendentes.length === 1, "PATCH retido");
      await clicar("Editar perfil");await esperar(() => chrome.avaliar("document.querySelector('.profileEditPanel')===null"), "edição fechada");pendentes.shift()();await chrome.avaliar("new Promise(r=>setTimeout(r,100))");assert.equal(await chrome.avaliar("document.getElementById('profile-name').textContent"), usuarioInicial.nomeCompleto);
    });
    await t.test("logout durante edição não permite resposta tardia restaurar dados da sessão", async () => {
      await abrir("/perfil");await clicar("Editar perfil");await escrever("nomeCompleto", "Nome de sessão encerrada");modo.hold = true;await clicar("Salvar perfil");await esperar(() => pendentes.length === 1, "PATCH retido");
      await chrome.avaliar("document.getElementById('sair-teste').click();true");await esperar(() => chrome.avaliar("document.getElementById('profile-name')?.textContent==='Nome não informado'"), "logout");
      pendentes.shift()();await chrome.avaliar("new Promise(r=>setTimeout(r,100))");assert.equal(await chrome.avaliar("document.querySelector('.profileEditPanel')===null"), true);assert.doesNotMatch(await texto(), /Nome de sessão encerrada/);
    });
    await t.test("cabeçalho e ações compactas não transbordam; exclusão continua exigindo confirmação", async () => {
      publicacoes = [{ _id: "000000000000000000000003", proprietario: id, status: "pending", titulo: "Trilha do Mirante", descricao: "Descrição sintética", endereco: "Local sintético", fotos: [] }];await abrir("/perfil");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.ownerDeleteButton'))"), "ações");
      for (const width of [1280, 640, 390, 320]) {
        await chrome.viewport(width, 1000);
        const medidas = await chrome.avaliar("(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();return {banner:r('.profileCover').bottom,nome:r('#profile-name').top,excluir:{h:r('.ownerDeleteButton').height,w:r('.ownerDeleteButton').width},editar:{h:r('.ownerEditButton').height,w:r('.ownerEditButton').width},overflow:document.documentElement.scrollWidth>innerWidth,cor:getComputedStyle(document.querySelector('.ownerDeleteButton')).backgroundColor,icone:Boolean(document.querySelector('.ownerDeleteButton svg'))};})()");
        assert.ok(medidas.nome >= medidas.banner);assert.equal(medidas.overflow, false);assert.equal(medidas.excluir.h, medidas.editar.h);assert.ok(medidas.excluir.h <= 48 && medidas.excluir.w < 190 && medidas.editar.w < 190);assert.equal(medidas.cor, "rgba(0, 0, 0, 0)");assert.equal(medidas.icone, true);
        if (width === 1280 || width === 390) { await chrome.avaliar("scrollTo(0,0)");await capturar(`perfil-${width}`); }
      }
      await chrome.avaliar("window.confirma=false");await clicar("Excluir publicação");assert.equal(mutacoes().length, 0);
      await chrome.avaliar("window.confirma=true");await clicar("Excluir publicação");await esperar(async () => (await texto()).includes("Publicação excluída"), "exclusão confirmada");assert.equal(mutacoes().at(-1).method, "DELETE");
    });
  } finally {
    pendentes.splice(0).forEach((fn) => fn());try { await chrome?.fechar(); } finally { try { await servidor?.close(); } finally { await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } }
  }
});
