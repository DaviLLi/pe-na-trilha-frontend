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
const id = (n) => n.toString(16).padStart(24, "0");
const pessoa = { _id: id(99), perfil: "user", nomeCompleto: "Pessoa da Trilha", nomeUsuario: "pessoa", email: "pessoa@example.invalid", fotoPerfil: null };
const post = (n, status = "approved", nFotos = 2) => ({ _id: id(n), proprietario: pessoa._id, titulo: `Trilha ${n}`, descricao: "Percurso entre árvores e mirantes. Informações da comunidade.", endereco: "Local sintético", status, fotos: Array.from({ length: nFotos }, (_, i) => ({ _id: id(n * 10 + i), updatedAt: "2026-11-13T12:00:00Z", width: 320, height: 180 })) });
const entrada = `
import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';
import {AuthProvider} from '/src/contexts/AuthContext.jsx';import api from '/src/services/api.js';import App from '/src/App.jsx';
const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const brush=canvas.getContext('2d');brush.fillStyle='#164c38';brush.fillRect(0,0,320,180);brush.fillStyle='#73d5b1';brush.fillRect(30,30,100,60);window.png=canvas.toDataURL('image/png').split(',')[1];
api.defaults.baseURL=location.origin;const root=createRoot(document.getElementById('root'));let seq=0;
window.abrir=pagina=>{history.replaceState(null,'',pagina);root.render(React.createElement(BrowserRouter,{key:++seq},React.createElement(AuthProvider,null,React.createElement(App))));};
window.ocultar=()=>root.render(null);
window.urls={criadas:[],revogadas:[]};const criar=URL.createObjectURL.bind(URL),revogar=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=b=>{const u=criar(b);window.urls.criadas.push(u);return u;};URL.revokeObjectURL=u=>{window.urls.revogadas.push(u);return revogar(u);};
if(location.pathname!=='/__test')window.abrir(location.pathname+location.search+location.hash);
`;
async function esperar(fn, nome) { const fim = Date.now() + 15000;while (Date.now() < fim) { if (await fn()) return;await new Promise((r) => setTimeout(r, 20)); }throw new Error(`Timeout: ${nome}`); }
test("Aplicação real: galeria, avatar persistido e rotas por sessão/papel com API sintética", { skip: !chromeDisponivel && "Chrome local ausente", timeout: 240000 }, async (t) => {
  const temp = await mkdtemp(join(tmpdir(), "pnt-gallery-routes-")), requests = [], pendentes = [];
  let db = [], usuario = { ...pessoa }, logado = true, modo = {}, pixel, png, origem, chrome, servidor, proximoPost = 700, versaoAvatar = 0;
  const dto = (pub, contexto) => ({ ...pub, fotos: pub.fotos.map((f) => ({ ...f, url: f.legada ? null : `${contexto === "autor" ? "/trilhas/minhas" : contexto === "admin" ? "/admin/trilhas" : "/trilhas"}/${pub._id}/fotos/${f._id}/conteudo` })) });
  try {
    servidor = await createServer({ root, configFile: false, cacheDir: join(temp, "vite"), logLevel: "error", server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, plugins: [react(), {
      name: "gallery-routes-synthetic-only",resolveId(id) { if (id === "/__gallery.jsx") return "\0gallery-test.jsx"; },load(id) { if (id === "\0gallery-test.jsx") return entrada; },
      configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
        const path = req.url.split("?")[0];
        if ((req.headers.accept || "").includes("text/html") && !path.includes(".")) {
          res.setHeader("Content-Type", "text/html");res.setHeader("Set-Cookie", "synthetic=1; HttpOnly; Path=/; SameSite=Lax");res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__gallery.jsx"></script></body></html>');return;
        }
        if (path === "/__avatar.png") { res.setHeader("Content-Type", "image/png");res.end(png);return; }
        if (!path.startsWith("/usuarios") && !path.startsWith("/trilhas") && !path.startsWith("/admin/trilhas")) return next();
        let body = "";for await (const chunk of req) body += chunk.toString();const registro = { url: req.url, method: req.method, body, headers: req.headers };requests.push(registro);
        const json = (status, data) => { if (res.destroyed) return;res.statusCode = status;res.setHeader("Content-Type", "application/json");res.end(status === 204 ? undefined : JSON.stringify(data)); };
        if (path === "/usuarios/refresh") { json(logado ? 200 : 401, logado ? { usuario } : { mensagem: "Sessão encerrada." });return; }
        if (path === "/usuarios/login") { logado = true;json(200, { usuario });return; }
        if (path === "/usuarios/csrf") { json(logado ? 200 : 401, { csrfToken: "csrf-sintetico" });return; }
        if (path === "/usuarios/logout") { logado = false;json(204);return; }
        if (path === "/usuarios/me") { json(200, usuario);return; }
        if (path === "/usuarios/me/foto-perfil") {
          const responder = () => { if (res.destroyed) return;if (modo.falhaAvatar) { json(502, { mensagem: "Upload do avatar indisponível." });return; }usuario.fotoPerfil = origem + "/__avatar.png?v=" + (++versaoAvatar);json(200, { fotoPerfil: usuario.fotoPerfil }); };
          if (modo.holdAvatar) pendentes.push(responder);else responder();return;
        }
        if (path.endsWith("/conteudo")) {
          const partes = path.split("/"), privado = partes.includes("minhas") || partes.includes("admin"), n = partes.indexOf("fotos"), pub = db.find((p) => p._id === partes[n - 1]);
          const responder = () => { if (res.destroyed) return;if (!pub || (!privado && pub.status !== "approved") || (privado && !logado)) { json(404, { mensagem: "Foto não autorizada." });return; }if (modo.expirarDetalhe && privado && req.url.includes("variante=detalhe")) { logado = false;json(401, { mensagem: "Sessão encerrada." });return; }if (modo.erroDetalhe && req.url.includes("variante=detalhe")) { json(404, { mensagem: "Foto privada indisponível." });return; }res.setHeader("Cache-Control", "private, no-store");res.setHeader("Content-Type", "image/webp");res.end(pixel); };
          if (privado && modo.holdDetalhe && req.url.includes("variante=detalhe")) pendentes.push(responder);else responder();return;
        }
        if (path === "/trilhas/minhas") { json(200, db.filter((p) => p.proprietario === usuario._id).map((p) => dto(p, "autor")));return; }
        if (path === "/trilhas/pendentes") { json(usuario.perfil === "admin" ? 200 : 403, usuario.perfil === "admin" ? db.filter((p) => p.status === "pending").map((p) => dto(p, "admin")) : { mensagem: "Acesso negado." });return; }
        if (path === "/trilhas" && req.method === "GET") { json(200, db.filter((p) => p.status === "approved").map((p) => dto(p, "publico")));return; }
        if (path === "/trilhas" && req.method === "POST") { const data = JSON.parse(body), nova = { ...data, _id: id(proximoPost++), status: "pending", proprietario: usuario._id, fotos: [] };db.push(nova);json(201, dto(nova, "autor"));return; }
        const item = db.find((p) => p._id === path.split("/")[2]);
        if (path.endsWith("/fotos") && req.method === "POST" && item) { const foto = { _id: id(9000 + item.fotos.length), updatedAt: "2026-11-13T13:00:00Z" };item.fotos.push(foto);json(201, dto(item, "autor").fotos.at(-1));return; }
        if (path.endsWith("/moderacao") && item) { item.status = JSON.parse(body).status;json(200, dto(item, "admin"));return; }
        if (path.startsWith("/trilhas/minhas/") && item) { json(200, dto(item, "autor"));return; }
        json(404, { mensagem: "Endpoint inesperado no teste." });
      }); },
    }] });
    await servidor.listen();origem = `http://127.0.0.1:${servidor.httpServer.address().port}`;
    await (await fetch(origem + "/__gallery.jsx")).text();chrome = await abrirChrome(join(temp, "chrome"));await chrome.navegar(origem + "/__test");await esperar(() => chrome.avaliar("typeof abrir==='function'"), "entrada");
    const pixels = await chrome.avaliar("(()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const x=c.getContext('2d');x.fillStyle='#164c38';x.fillRect(0,0,320,180);x.fillStyle='#73d5b1';x.fillRect(30,30,100,60);window.png=c.toDataURL('image/png').split(',')[1];return {webp:c.toDataURL('image/webp').split(',')[1],png:window.png};})()");pixel = Buffer.from(pixels.webp, "base64");png = Buffer.from(pixels.png, "base64");
    const texto = () => chrome.avaliar("document.body.textContent");
    const abrir = async (pagina) => { await chrome.avaliar(`abrir(${JSON.stringify(pagina)})`);await esperar(() => chrome.avaliar("Boolean(document.querySelector('main')) && !document.querySelector('.sessionLoading')"), "sessão carregada"); };
    const clicar = (rotulo, seletor = "body") => chrome.avaliar(`(()=>{const el=[...document.querySelector(${JSON.stringify(seletor)}).querySelectorAll('button,a')].find(el=>el.textContent.trim()===${JSON.stringify(rotulo)});if(!el)throw new Error('Controle ausente: '+${JSON.stringify(rotulo)});el.click();})()`);
    const escrever = (campo, valor) => chrome.avaliar(`(()=>{const el=document.getElementById(${JSON.stringify(campo)});Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(valor)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    const selecionar = (seletor, nomes, tipo = "image/png", tamanho) => chrome.avaliar(`(()=>{const dt=new DataTransfer();for(const nome of ${JSON.stringify(nomes)})dt.items.add(new File([${tamanho ? `new Uint8Array(${tamanho})` : "Uint8Array.from(atob(window.png),c=>c.charCodeAt(0))"}],nome,{type:${JSON.stringify(tipo)}}));const el=document.querySelector(${JSON.stringify(seletor)});el.files=dt.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const login = async () => { await escrever("identificador", "pessoa");await escrever("senha", "SenhaSegura1!");await chrome.avaliar("document.querySelector('.authForm').requestSubmit()"); };
    const modal = (posicao) => esperar(() => chrome.avaliar(`Boolean(document.querySelector('dialog[open]')) && document.querySelector('.galleryHeader > span')?.textContent===${JSON.stringify(posicao)}`), "galeria " + posicao);
    const fotoPronta = () => esperar(() => chrome.avaliar("Boolean(document.querySelector('dialog img')?.complete && document.querySelector('dialog img')?.naturalWidth)"), "foto ampliada");
    const fechar = async () => { if (await chrome.avaliar("Boolean(document.querySelector('dialog[open]'))")) { await chrome.pressionarTecla("Escape");await esperar(() => chrome.avaliar("document.querySelector('dialog')===null"), "fechar galeria"); } };
    async function captura(nome) { if (process.env.PNT_VISUAL_CAPTURE_DIR) await writeFile(join(process.env.PNT_VISUAL_CAPTURE_DIR, nome + ".png"), Buffer.from((await chrome.capturar()).data, "base64")); }
    t.afterEach(async () => { await fechar();await chrome.avaliar("ocultar()");await esperar(() => chrome.avaliar("document.querySelector('main')===null"), "desmontagem");pendentes.splice(0).forEach((fn) => fn());requests.length = 0;modo = {};logado = true;usuario = { ...pessoa };db = []; });

    await t.test("visitante é redirecionado em URLs internas diretas; documentos e cadastro permanecem públicos", async () => {
      logado = false;
      for (const path of ["/trilhas", "/perfil", "/trilhas/nova", `/trilhas/${id(1)}/editar`, "/admin", "/ajuda", "/medalhas", "/"]) {
        await abrir(path);await esperar(() => chrome.avaliar("location.pathname==='/login' && Boolean(document.getElementById('identificador'))"), "login obrigatório");assert.equal(await chrome.avaliar("document.querySelector('.productSidebar')===null"), true);
      }
      assert.equal(requests.some((r) => r.url.startsWith("/trilhas")), false);
      for (const path of ["/cadastro", "/termos", "/privacidade"]) { await abrir(path);assert.equal(await chrome.avaliar("location.pathname"), path); }
      await chrome.navegar(origem + "/perfil");try { await esperar(() => chrome.avaliar("location.pathname==='/login' && Boolean(document.getElementById('identificador'))"), "entrada pelo navegador"); } catch (falha) { throw new Error(falha.message + JSON.stringify(await chrome.avaliar("({path:location.pathname,text:document.body.textContent.slice(0,500)})")) + chrome.diagnostico()); }await captura("acesso-deslogado");
    });
    await t.test("login retorna à página solicitada; usuário comum não acessa administração e admin acessa", async () => {
      logado = false;await abrir("/perfil");await esperar(() => chrome.avaliar("Boolean(document.getElementById('identificador'))"), "login");await login();await esperar(() => chrome.avaliar("location.pathname==='/perfil' && Boolean(document.getElementById('profile-name'))"), "retorno ao Perfil");
      await abrir("/admin");await esperar(() => chrome.avaliar("location.pathname==='/trilhas'"), "admin bloqueado");assert.equal(requests.some((r) => r.url === "/trilhas/pendentes"), false);assert.equal(await chrome.avaliar("document.querySelector('[aria-label=Administração]')===null"), true);for (const largura of [1280, 390]) { await chrome.viewport(largura, 1000);await captura(`usuario-comum-${largura}`); }
      usuario.perfil = "admin";await abrir("/admin");await esperar(async () => (await texto()).includes("Nenhuma publicação pendente"), "admin autorizado");assert.equal(await chrome.avaliar("Boolean(document.querySelector('[aria-label=Administração]'))"), true);for (const largura of [1280, 390]) { await chrome.viewport(largura, 1000);await captura(`administrador-${largura}`); }
    });
    await t.test("Feed amplia detalhe, navega com botões/setas e ESC devolve foco", async () => {
      db = [post(1)];await chrome.viewport(1280, 1000);await abrir("/trilhas");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.postPhoto img')?.naturalWidth)"), "Feed");
      await chrome.avaliar("document.querySelector('.postPhoto .photoOpenControl').focus();document.querySelector('.postPhoto .photoOpenControl').click();true");await modal("1 de 2");await fotoPronta();
      assert.match(await chrome.avaliar("document.querySelector('dialog img').src"), /\/trilhas\/.+variante=detalhe$/);await clicar("Próxima →", "dialog");await modal("2 de 2");await fotoPronta();
      const proporcao = await chrome.avaliar("(()=>{const i=document.querySelector('dialog img'),r=i.getBoundingClientRect();return Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight);})()");assert.ok(proporcao < .01);await captura("galeria-feed-desktop");
      await chrome.pressionarTecla("ArrowLeft");await modal("1 de 2");await fechar();assert.equal(await chrome.avaliar("document.activeElement===document.querySelector('.postPhoto .photoOpenControl')"), true);
      await captura("feed-desktop");
    });
    await t.test("gesto real de deslizar navega no celular; legenda e layout cabem em celular e tablet", async () => {
      db = [post(1)];await chrome.viewport(390, 844);await abrir("/trilhas");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.photoOpenControl'))"), "Feed");await chrome.avaliar("document.querySelector('.photoOpenControl').click();true");await modal("1 de 2");await fotoPronta();
      const ponto = await chrome.avaliar("(()=>{const r=document.querySelector('.galleryStage').getBoundingClientRect();return {x:r.right-25,y:r.top+r.height/2,fim:r.left+25};})()");await chrome.deslizar(ponto.x, ponto.y, ponto.fim);await modal("2 de 2");await fotoPronta();await captura("galeria-feed-mobile");await fechar();
      for (const largura of [390, 768, 1280]) { await chrome.viewport(largura, 1000);assert.equal(await chrome.avaliar("document.documentElement.scrollWidth>innerWidth"), false); }
    });
    await t.test("Perfil usa detalhe privado por Blob, posição, erro legado e revogação ao navegar", async () => {
      db = [post(2, "pending", 3)];db[0].fotos[2].legada = true;await abrir("/perfil");await esperar(() => chrome.avaliar("document.querySelectorAll('.profilePostPhoto').length===3"), "Perfil");
      await chrome.avaliar("document.querySelectorAll('.profilePostPhoto .photoOpenControl')[1].click();true");await modal("2 de 3");await fotoPronta();const url = await chrome.avaliar("document.querySelector('dialog img').src");assert.match(url, /^blob:/);
      assert.ok(requests.some((r) => r.url.includes("/trilhas/minhas/") && r.url.endsWith("variante=detalhe") && r.headers.cookie.includes("synthetic=1")));
      await clicar("← Anterior", "dialog");await modal("1 de 3");await fotoPronta();assert.equal(await chrome.avaliar(`window.urls.revogadas.includes(${JSON.stringify(url)})`), true);await captura("galeria-perfil");await chrome.viewport(390, 844);await captura("galeria-perfil-mobile");await chrome.viewport(1280, 1000);
      await clicar("Próxima →", "dialog");await modal("2 de 3");await fotoPronta();const antes = requests.length;await clicar("Próxima →", "dialog");await modal("3 de 3");await esperar(async () => (await texto()).includes("Foto indisponível."), "legada");assert.equal(requests.length, antes);await fechar();await captura("perfil-multiplas-fotos");
    });
    await t.test("erro Blob mantém mensagem; fechar durante download cancela sem criar URL tardia", async () => {
      db = [post(2, "rejected")];modo.erroDetalhe = true;await abrir("/perfil");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.profilePostPhoto button'))"), "fotos");await chrome.avaliar("document.querySelector('.profilePostPhoto button').click();true");await modal("1 de 2");await esperar(async () => (await texto()).includes("Foto privada indisponível."), "erro Blob");await fechar();
      modo = { holdDetalhe: true };await chrome.avaliar("document.querySelector('.profilePostPhoto button').click();true");await esperar(() => pendentes.length === 1, "download retido");const antes = await chrome.avaliar("window.urls.criadas.length");await fechar();pendentes.shift()();await chrome.avaliar("new Promise(r=>setTimeout(r,100))");assert.equal(await chrome.avaliar("window.urls.criadas.length"), antes);
    });
    await t.test("sessão revogada durante entrega privada fecha a galeria e redireciona ao login", async () => {
      db = [post(2, "pending")];await abrir("/perfil");await esperar(() => chrome.avaliar("document.querySelectorAll('.profilePostPhoto img').length===2"), "miniaturas privadas");modo.expirarDetalhe = true;
      await chrome.avaliar("document.querySelector('.profilePostPhoto button').click();true");await esperar(() => chrome.avaliar("location.pathname==='/login' && Boolean(document.getElementById('identificador'))"), "sessão revogada");assert.equal(await chrome.avaliar("document.querySelector('dialog')===null"), true);assert.equal(await chrome.avaliar("document.querySelector('.productSidebar')===null"), true);
    });
    await t.test("publicação recém-criada mostra fotos privadas; aprovação libera Feed sem mudar contrato", async () => {
      await abrir("/trilhas/nova");await esperar(() => chrome.avaliar("Boolean(document.getElementById('titulo'))"), "cadastro");await escrever("titulo", "Nova trilha com fotos");await escrever("descricao", "Descrição da nova trilha");await escrever("endereco", "Local novo");await selecionar("#fotos-publicacao", ["um.png", "dois.png"]);await chrome.avaliar("document.querySelector('.trilhaForm').requestSubmit()");await esperar(async () => (await texto()).includes("2 foto(s) com envio confirmado"), "uploads concluídos");await clicar("Ver minhas publicações");await esperar(() => chrome.avaliar("document.querySelectorAll('.profilePostPhoto img').length===2"), "fotos no Perfil");await captura("publicacao-criada");await chrome.viewport(390, 1000);await captura("publicacao-criada-mobile");await chrome.viewport(1280, 1000);assert.equal(db[0].status, "pending");
      await abrir("/trilhas");await esperar(async () => (await texto()).includes("Nenhuma trilha cadastrada"), "Feed sem pendente");usuario.perfil = "admin";await abrir("/admin");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.adminPostCard'))"), "moderação");await clicar("Aprovar");await esperar(async () => (await texto()).includes("Publicação aprovada."), "aprovação");await abrir("/trilhas");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.postPhoto img')?.naturalWidth)"), "Feed com fotos aprovadas");assert.match(await texto(), /Nova trilha com fotos/);assert.equal(db[0].status, "approved");
    });
    await t.test("avatar tem prévia, upload único, atualiza Perfil/Sidebar e persiste em novo login", async () => {
      await chrome.viewport(1280, 1000);await abrir("/perfil");await clicar("Alterar foto");await selecionar('#editar-foto-perfil input[type=file]', ["avatar.png"]);await esperar(() => chrome.avaliar("Boolean(document.querySelector('#editar-foto-perfil .selectedPhoto img')?.naturalWidth)"), "prévia");
      modo.holdAvatar = true;await clicar("Salvar foto");await esperar(() => pendentes.length === 1, "upload retido");assert.match(await texto(), /Enviando foto/);const upload = requests.find((r) => r.url === "/usuarios/me/foto-perfil");assert.equal(upload.method, "PUT");assert.match(upload.headers["content-type"], /^multipart\/form-data; boundary=/);assert.match(upload.body, /name="imagem"/);assert.equal(upload.headers["x-csrf-token"], "csrf-sintetico");
      pendentes.shift()();await esperar(async () => (await texto()).includes("Foto de perfil atualizada."), "confirmação");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.profileAvatar img')?.naturalWidth && document.querySelector('.sidebarAccount img')?.naturalWidth)"), "avatar atualizado");const url = usuario.fotoPerfil;await captura("avatar-atualizado");await chrome.viewport(390, 1000);assert.equal(await chrome.avaliar("document.documentElement.scrollWidth>innerWidth"), false);await captura("avatar-atualizado-mobile");await chrome.viewport(1280, 1000);
      await clicar("Sair", ".productNav");await esperar(() => chrome.avaliar("Boolean(document.getElementById('identificador'))"), "logout");await login();await esperar(() => chrome.avaliar(`Boolean(document.querySelector('.sidebarAccount img')) && document.querySelector('.sidebarAccount img').src===${JSON.stringify(url)}`), "avatar após login novo");await abrir("/perfil");await esperar(() => chrome.avaliar(`document.querySelector('.profileAvatar img')?.src===${JSON.stringify(url)}`), "persistência via sessão");await chrome.navegar(origem + "/perfil");await esperar(() => chrome.avaliar(`document.querySelector('.profileAvatar img')?.src===${JSON.stringify(url)}`), "persistência ao recarregar");
    });
    await t.test("avatar inválido ou falha remota não anuncia sucesso nem altera foto salva", async () => {
      await abrir("/perfil");await clicar("Alterar foto");for (const [tipo, tamanho] of [["image/svg+xml", 10], ["image/png", 5242881]]) { await selecionar('#editar-foto-perfil input[type=file]', ["invalida"], tipo, tamanho);assert.equal(requests.some((r) => r.url === "/usuarios/me/foto-perfil"), false); }
      await selecionar('#editar-foto-perfil input[type=file]', ["valida.png"]);modo.falhaAvatar = true;await clicar("Salvar foto");await esperar(async () => (await texto()).includes("Upload do avatar indisponível."), "erro upload");assert.equal(usuario.fotoPerfil, null);assert.doesNotMatch(await texto(), /Foto de perfil atualizada\./);
    });
    await t.test("layout e tipografia preservam ícones e proporção em diferentes tamanhos", async () => {
      db = [post(1)];for (const largura of [390, 768, 1280]) { await chrome.viewport(largura, 1000);await abrir("/trilhas");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.postText'))"), "Feed");assert.equal(await chrome.avaliar("document.documentElement.scrollWidth>innerWidth"), false);await captura(`feed-${largura}`);await abrir("/perfil");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.profilePostCard'))"), "Perfil");assert.equal(await chrome.avaliar("document.documentElement.scrollWidth>innerWidth"), false);await captura(`perfil-${largura}`); }
      const medidas = await chrome.avaliar("({texto:parseFloat(getComputedStyle(document.querySelector('.profilePostCard > p')).fontSize),icone:document.querySelector('.navIcon').getBoundingClientRect().width})");assert.ok(medidas.texto >= 14);assert.ok(medidas.icone < 20);
      await chrome.avaliar("ocultar()");await esperar(() => chrome.avaliar("document.querySelector('main')===null"), "desmontagem final");const urls = await chrome.avaliar("window.urls");assert.deepEqual([...urls.criadas].sort(), [...urls.revogadas].sort());
    });
  } finally { pendentes.splice(0).forEach((fn) => fn());try { await chrome?.fechar(); } finally { try { await servidor?.close(); } finally { await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } } }
});
