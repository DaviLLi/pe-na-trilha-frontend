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
const post = (n, status = "approved", nFotos = 2) => ({ _id: id(n), revisao: "legacy:" + n, proprietario: pessoa._id, titulo: `Trilha ${n}`, descricao: "Percurso entre árvores e mirantes. Informações da comunidade.", endereco: "Local sintético", status, fotos: Array.from({ length: nFotos }, (_, i) => ({ _id: id(n * 10 + i), updatedAt: "2026-11-13T12:00:00Z", width: 320, height: 180 })) });
const entrada = `
import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';
import {AuthProvider} from '/src/contexts/AuthContext.jsx';import api from '/src/services/api.js';import App from '/src/App.jsx';
const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const brush=canvas.getContext('2d');brush.fillStyle='#164c38';brush.fillRect(0,0,320,180);brush.fillStyle='#73d5b1';brush.fillRect(30,30,100,60);window.png=canvas.toDataURL('image/png').split(',')[1];
api.interceptors.request.use(config=>{if(config.url==='/usuarios/me/foto-perfil'&&config.data instanceof FormData)window.ultimoAvatar=config.data.get('imagem');return config;});
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
  let db = [], usuario = { ...pessoa }, logado = true, modo = {}, pixel, detalhePixel, png, origem, chrome, servidor, proximoPost = 700, versaoAvatar = 0;
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
        if (path === "/usuarios/login") {
          if (modo.limiteLogin) {
            res.setHeader("Retry-After", "3");
            json(429, { mensagem: "Muitas tentativas de login. Tente novamente mais tarde." });
            return;
          }
          logado = true;json(200, { usuario });return;
        }
        if (path === "/usuarios/csrf") { json(logado ? 200 : 401, { csrfToken: "csrf-sintetico" });return; }
        if (path === "/usuarios/logout") { logado = false;json(204);return; }
        if (path === "/usuarios/me") { json(200, usuario);return; }
        if (path === "/usuarios/me/foto-perfil") {
          if (req.method === "DELETE") {
            if (modo.falhaRemocaoAvatar) { json(502, { mensagem: "Remoção do avatar indisponível." });return; }
            usuario.fotoPerfil = null;
            json(200, { fotoPerfil: null });return;
          }
          const responder = () => { if (res.destroyed) return;if (modo.falhaAvatar) { json(502, { mensagem: "Upload do avatar indisponível." });return; }usuario.fotoPerfil = origem + "/__avatar.png?v=" + (++versaoAvatar);json(200, { fotoPerfil: usuario.fotoPerfil }); };
          if (modo.holdAvatar) pendentes.push(responder);else responder();return;
        }
        if (path.endsWith("/conteudo")) {
          const partes = path.split("/"), privado = partes.includes("minhas") || partes.includes("admin"), n = partes.indexOf("fotos"), pub = db.find((p) => p._id === partes[n - 1]);
          const responder = () => { if (res.destroyed) return;if (!pub || (!privado && pub.status !== "approved") || (privado && !logado)) { json(404, { mensagem: "Foto não autorizada." });return; }if (modo.expirarDetalhe && privado && req.url.includes("variante=detalhe")) { logado = false;json(401, { mensagem: "Sessão encerrada." });return; }if (modo.erroDetalhe && req.url.includes("variante=detalhe")) { json(404, { mensagem: "Foto privada indisponível." });return; }res.setHeader("Cache-Control", "private, no-store");res.setHeader("Content-Type", "image/webp");res.end(req.url.includes("variante=detalhe") ? detalhePixel : pixel); };
          if (privado && modo.holdDetalhe && req.url.includes("variante=detalhe")) pendentes.push(responder);else responder();return;
        }
        if (path === "/trilhas/minhas") { json(200, db.filter((p) => p.proprietario === usuario._id).map((p) => dto(p, "autor")));return; }
        if (path === "/trilhas/pendentes") { json(usuario.perfil === "admin" ? 200 : 403, usuario.perfil === "admin" ? db.filter((p) => p.status === "pending" && !p.fotosPrevistas).map((p) => dto(p, "admin")) : { mensagem: "Acesso negado." });return; }
        if (path === "/trilhas" && req.method === "GET") { json(200, db.filter((p) => p.status === "approved" && (!new URL(req.url,"http://teste").searchParams.get("busca") || [p.titulo,p.descricao,p.endereco,p.tipoLocal,p.dificuldade,p.condicaoCaminho,p.sinalizacao,p.estacionamento,p.banheiro,p.alimentacao,p.estruturaBanho,p.acesso,p.caracteristicaPrincipal].some(v => typeof v === "string" && v.toLocaleLowerCase("pt-BR").includes(new URL(req.url,"http://teste").searchParams.get("busca").toLocaleLowerCase("pt-BR"))))).map((p) => dto(p, "publico")));return; }
        if (path === "/trilhas" && req.method === "POST") { const data = JSON.parse(body), nova = { ...data, _id: id(proximoPost), revisao: "legacy:" + proximoPost++, status: "pending", proprietario: usuario._id, fotos: [] };db.push(nova);json(201, dto(nova, "autor"));return; }
        const item = db.find((p) => p._id === path.split("/")[path.startsWith("/trilhas/minhas/") ? 3 : 2]);
        if (path.endsWith("/fotos") && req.method === "POST" && item) {
          const responder = () => {
            if (res.destroyed) return;
            const foto = { _id: id(9000 + item.fotos.length), updatedAt: "2026-11-13T13:00:00Z" };
            item.fotos.push(foto);
            if (item.fotos.length === item.fotosPrevistas) delete item.fotosPrevistas;
            json(201, dto(item, "autor").fotos.at(-1));
          };
          if (modo.holdUpload) pendentes.push(responder); else responder();
          return;
        }
        if (path.endsWith("/moderacao") && item) { const decisao = JSON.parse(body);assert.equal(decisao.revisao, item.revisao);item.status = decisao.status;json(200, dto(item, "admin"));return; }
        if (path.startsWith("/trilhas/minhas/") && item) { json(200, dto(item, "autor"));return; }
        json(404, { mensagem: "Endpoint inesperado no teste." });
      }); },
    }] });
    await servidor.listen();origem = `http://127.0.0.1:${servidor.httpServer.address().port}`;
    await (await fetch(origem + "/__gallery.jsx")).text();chrome = await abrirChrome(join(temp, "chrome"));await chrome.navegar(origem + "/__test");await esperar(() => chrome.avaliar("typeof abrir==='function'"), "entrada");
    const pixels = await chrome.avaliar("(()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const x=c.getContext('2d');x.fillStyle='#164c38';x.fillRect(0,0,320,180);x.fillStyle='#73d5b1';x.fillRect(30,30,100,60);window.png=c.toDataURL('image/png').split(',')[1];return {webp:c.toDataURL('image/webp').split(',')[1],png:window.png};})()");pixel = Buffer.from(pixels.webp, "base64");png = Buffer.from(pixels.png, "base64");
    detalhePixel = Buffer.from(await chrome.avaliar("(()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;const x=c.getContext('2d');x.fillStyle='#164c38';x.fillRect(0,0,1280,720);x.fillStyle='#73d5b1';x.fillRect(120,120,400,240);for(let i=0;i<1280;i+=20){x.fillStyle=i%40?'#315d48':'#204e3a';x.fillRect(i,650,10,70);}return c.toDataURL('image/webp',.95).split(',')[1];})()"), "base64");
    const texto = () => chrome.avaliar("document.body.textContent");
    async function navegar(pagina) {
      const documentoAnterior = await chrome.avaliar("performance.timeOrigin");
      await chrome.navegar(origem + pagina);
      try {
        await esperar(() => chrome.avaliar(`performance.timeOrigin !== ${documentoAnterior} && typeof abrir === 'function'`), `novo documento em ${pagina}`);
      } catch (erro) {
        const estado = await chrome.avaliar(`({ caminho: location.pathname, estado: document.readyState,
          html: document.body?.textContent.slice(0, 240), scripts: [...document.scripts].map(({src}) => src) })`);
        throw new Error(`${erro.message}\n${JSON.stringify(estado)}\n${chrome.diagnostico()}`, { cause: erro });
      }
    }
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

    await t.test("cenário do Feed preserva a sessão e os nomes PNG salvos e carrega os dez WebPs", async () => {
      usuario.perfil = "admin";
      db = [post(1), post(2), post(3)];
      const seletor = ".feedScenery img";
      const chaveSessao = "pe-na-trilha:cenario-feed:sessao:v1";
      const chaveAnterior = "pe-na-trilha:cenario-feed:anterior:v1";
      const cenarioLegado = "Refúgio Rochoso com Mar Turquesa.png";
      const semCenario = () => chrome.avaliar("document.querySelector('.feedScenery') === null");
      const carregarCenario = async () => {
        await esperar(() => chrome.avaliar(`document.querySelector('${seletor}')?.naturalWidth > 0`), "WebP decodificado no Feed");
        return chrome.avaliar(`document.querySelector('${seletor}').currentSrc`);
      };
      const irPeloMenu = async (caminho) => {
        const link = `.productNav a[href="${caminho}"]`;
        await chrome.avaliar(`document.querySelector('${link}').click()`);
        await esperar(() => chrome.avaliar(`document.querySelector('${link}').getAttribute('aria-current') === 'page'`), caminho);
      };

      await chrome.avaliar(`(() => {
        const usuarioId = ${JSON.stringify(usuario._id)};
        const cenario = ${JSON.stringify(cenarioLegado)};
        sessionStorage.setItem(${JSON.stringify(chaveSessao)}, JSON.stringify({ usuarioId, cenario }));
        localStorage.setItem(${JSON.stringify(chaveAnterior)} + ':' + usuarioId, JSON.stringify(cenario));
      })()`);
      await chrome.viewport(1280, 1000);
      await abrir("/perfil");
      assert.equal(await semCenario(), true);
      assert.equal(await chrome.avaliar("performance.getEntriesByType('resource').some(r => r.initiatorType === 'img' && r.name.includes('/cenarios-feed/'))"), false);
      await irPeloMenu("/trilhas");
      const primeiro = await carregarCenario();
      assert.equal(decodeURIComponent(new URL(primeiro).pathname.split("/").pop()), cenarioLegado.replace(/\.png$/, ".webp"));
      const recursosCenario = () => chrome.avaliar("performance.getEntriesByType('resource').filter(r => r.initiatorType === 'img' && r.name.includes('/cenarios-feed/')).map(r => r.name)");
      await esperar(async () => (await recursosCenario()).includes(primeiro), "registro do cenário carregado");
      assert.deepEqual(await recursosCenario(), [primeiro]);
      await esperar(() => chrome.avaliar("Boolean(document.querySelector('.post'))"), "publicação");

      for (const largura of [1280, 390, 320]) {
        await chrome.viewport(largura, 900);
        const medirCobertura = (posicao) => chrome.avaliar(`(async () => {
          const raiz = document.documentElement;
          window.scrollTo(0, (raiz.scrollHeight - raiz.clientHeight) * ${posicao});
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const camada = document.querySelector('.feedScenery');
          const imagem = camada.firstElementChild;
          const pagina = document.querySelector('.feedPage').getBoundingClientRect();
          const barra = document.querySelector('.productSidebar').getBoundingClientRect();
          const cenario = camada.getBoundingClientRect();
          const foto = imagem.getBoundingClientRect();
          const { filter, maskImage, objectFit, objectPosition } = getComputedStyle(imagem);
          const coincide = (a, b) => Math.abs(a - b) < 1;
          const estilos = () => ['.productSidebar', '.trailSearch', '.post', '.carouselStage', '.profileRefreshButton', '.guideCard'].map(seletor => {
            const el = document.querySelector(seletor);
            const { background, color, border, padding } = getComputedStyle(el);
            return [background, color, border, padding, el.getBoundingClientRect().toJSON()];
          });
          const antes = estilos();
          camada.hidden = true;
          const depois = estilos();
          camada.hidden = false;
          return {
            igual: JSON.stringify(antes) === JSON.stringify(depois),
            cobrePagina: ['top', 'right', 'bottom', 'left'].every(lado => coincide(cenario[lado], pagina[lado])),
            cobreLargura: coincide(foto.left, innerWidth <= 640 ? 0 : barra.right) && coincide(foto.right, raiz.clientWidth),
            cobreAltura: coincide(foto.top, innerWidth <= 640 ? barra.bottom : 0) && coincide(foto.bottom, raiz.clientHeight),
            semRolagemHorizontal: raiz.scrollWidth === raiz.clientWidth,
            rolou: scrollY > 0,
            filter, maskImage, objectFit, objectPosition,
          };
        })()`);
        for (const [posicao, nome] of [[0, "topo"], [.5, "meio"], [1, "fim"]]) {
          assert.deepEqual(await medirCobertura(posicao), {
            igual: true, cobrePagina: true, cobreLargura: true, cobreAltura: true,
            semRolagemHorizontal: true, rolou: posicao > 0,
            filter: "brightness(0.64)", maskImage: "none", objectFit: "cover", objectPosition: "50% 50%",
          }, `${largura} px, ${nome}`);
          if (posicao !== .5) await captura(`cenario-feed-${largura}${posicao ? "-fim" : ""}`);
        }
      }

      await chrome.viewport(1280, 1000);
      await clicar("Atualizar Feed");
      assert.equal(await carregarCenario(), primeiro);
      for (const caminho of ["/perfil", "/medalhas", "/trilhas/nova", "/admin", "/ajuda"]) {
        await irPeloMenu(caminho);
        assert.equal(await semCenario(), true, caminho);
      }
      await irPeloMenu("/trilhas");
      assert.equal(await carregarCenario(), primeiro);
      await navegar("/trilhas");
      assert.equal(await carregarCenario(), primeiro);

      await clicar("Sair", ".productNav");
      await esperar(() => chrome.avaliar("Boolean(document.getElementById('identificador'))"), "logout");
      assert.equal(await semCenario(), true);
      await navegar("/cadastro");
      await esperar(() => chrome.avaliar("Boolean(document.getElementById('nomeCompleto'))"), "cadastro de usuário");
      assert.equal(await semCenario(), true);
      await navegar("/login");
      await esperar(() => chrome.avaliar("Boolean(document.getElementById('identificador'))"), "login");
      await login();
      const segundo = await carregarCenario();
      assert.notEqual(segundo, primeiro);

      await chrome.avaliar("sessionStorage.clear()");
      await navegar("/trilhas");
      assert.notEqual(await carregarCenario(), segundo, "entrada em uma nova sessão de navegador com cookie válido");

      const catalogo = await chrome.avaliar(`(async () => {
        const { cenariosFeed, obterCenarioFeed, encerrarSessaoCenarioFeed } = await import('/src/services/cenariosFeed.js');
        const urls = Object.values(cenariosFeed);
        const legado = ${JSON.stringify(cenarioLegado)};
        const candidatos = urls.filter(url => url !== cenariosFeed[legado]);
        const sorteados = [];
        const sorteadosComAnterior = [];
        const aleatorio = Math.random;
        try {
          for (let i = 0; i < urls.length; i++) {
            Math.random = () => (i + .5) / urls.length;
            sorteados.push(obterCenarioFeed('cenario-teste-' + i));
            encerrarSessaoCenarioFeed();
          }
          for (let i = 0; i < candidatos.length; i++) {
            const usuarioId = 'cenario-anterior-teste-' + i;
            localStorage.setItem(${JSON.stringify(chaveAnterior)} + ':' + usuarioId, JSON.stringify(legado));
            Math.random = () => (i + .5) / candidatos.length;
            sorteadosComAnterior.push(obterCenarioFeed(usuarioId));
            encerrarSessaoCenarioFeed();
          }
        } finally {
          Math.random = aleatorio;
        }
        for (const url of urls) {
          const imagem = new Image();
          imagem.src = url;
          await imagem.decode();
        }
        return {
          quantidade: urls.length,
          distintos: new Set(sorteados).size,
          somenteWebp: urls.every(url => url.endsWith('.webp')),
          candidatos: candidatos.length,
          excluiuAnterior: sorteadosComAnterior.every((url, i) => url === candidatos[i]),
        };
      })()`);
      assert.deepEqual(catalogo, {
        quantidade: 10, distintos: 10, somenteWebp: true, candidatos: 9, excluiuAnterior: true,
      });
    });

    await t.test("matriz responsiva das telas principais", async () => {
      const resultados = [];
      usuario.perfil = "admin";
      db = [post(1, "approved"), post(2, "pending")];
      db[0].createdAt = "2026-11-10T15:35:00Z";
      db[0].autor = { nomeCompleto: "Pessoa da Trilha", nomeUsuario: "pessoa" };
      for (const largura of [320,375,390,430,768,1024,1280]) {
        await chrome.viewport(largura, 1000);
        for (const [nome, pagina, pronto] of [["feed","/trilhas",".post"],["perfil","/perfil",".profilePostCard"],["nova","/trilhas/nova",".trilhaForm"],["edicao",`/trilhas/${id(2)}/editar`,".trilhaForm"],["admin","/admin",".adminDecisionButtons"]]) {
          await abrir(pagina);
          try {
            await esperar(() => chrome.avaliar(`Boolean(document.querySelector('${pronto}'))`), `${nome} em ${largura} px`);
          } catch (erro) {
            const ultimas = requests.slice(-6).map(({ method, url }) => `${method} ${url}`);
            throw new Error(`${erro.message}\n${(await texto()).slice(0, 500)}\n${ultimas.join("\n")}\n${chrome.diagnostico()}`, { cause: erro });
          }
          if (nome === "perfil") await esperar(() => chrome.avaliar("Boolean(document.querySelector('.profileMedalValue'))"),"medalha");
          const medir = async (tela) => {
            await chrome.avaliar("document.fonts.ready");
            const m = await chrome.avaliar(`(()=>{const sels=['main','.post','.profileCover','.profileIdentity','.formCard','.productSidebar','.trailSearch','.guideCard','.profileRefreshButton'];return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,excedentes:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>document.documentElement.clientWidth+1}).map(e=>e.className).slice(0,10),geometria:Object.fromEntries(sels.map(s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return [s,r?{x:r.x,y:r.y,w:r.width,h:r.height}:null]}))};})()`);
            resultados.push({ largura, tela, ...m });await captura(`matriz-${tela}-${largura}`);
            if (!process.env.PNT_RESP_BASELINE) assert.equal(m.overflow,false,`${tela} ${largura}: ${m.excedentes}`);
          };
          await medir(nome);
          if (nome === "perfil") { await clicar("Editar perfil");await esperar(()=>chrome.avaliar("Boolean(document.querySelector('#editar-perfil input'))"),"editor");await medir("editar-perfil"); }
          if (nome === "feed") {
            if (!process.env.PNT_RESP_BASELINE) {
              const alinhamento = await chrome.avaliar("(()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {post:r('.post'),atualizar:r('.profileRefreshButton'),busca:r('.trailSearch'),guia:r('.guideCard')};})()");
              assert.ok(Math.abs(alinhamento.post.x-alinhamento.atualizar.x)<1,JSON.stringify({largura,...alinhamento}));assert.ok(Math.abs(alinhamento.post.width-alinhamento.atualizar.width)<1);
              if(largura>860) assert.ok(Math.abs(alinhamento.busca.y-alinhamento.guia.y)<1);
            }
            await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.post .photoOpenControl'))"),"foto");await chrome.avaliar("document.querySelector('.post .photoOpenControl').click()");await modal("1 de 2");await fotoPronta();await medir("galeria");await fechar();
          }
        }
      }
      if(process.env.PNT_VISUAL_CAPTURE_DIR) await writeFile(join(process.env.PNT_VISUAL_CAPTURE_DIR,"medidas.json"), JSON.stringify(resultados,null,2));
    });
    await t.test("datas reais e cores automáticas da medalha", async () => {
      db = [post(1)];db[0].createdAt = "2026-11-10T15:35:00Z";db[0].updatedAt = "2026-11-17T18:00:00Z";
      await abrir("/trilhas");await esperar(()=>chrome.avaliar("Boolean(document.querySelector('time'))"),"data");
      assert.equal(await chrome.avaliar("document.querySelector('time').dateTime"),"2026-11-10T15:35:00.000Z");
      assert.equal(await chrome.avaliar("document.querySelector('time').textContent"),await chrome.avaliar("new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date('2026-11-10T15:35:00Z'))+' · '+new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date('2026-11-10T15:35:00Z'))"));
      for(const valor of [undefined,null,"", "inválida"]) { db[0].createdAt=valor;await abrir("/trilhas");await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.post'))"),"post sem data");assert.equal(await chrome.avaliar("document.querySelector('time')===null"),true); }
      for(const [quantidade,medalha] of [[0,"transparente"],[1,"verde"],[16,"bronze"],[31,"prata"],[50,"ouro"]]) {
        db=Array.from({length:quantidade},(_,i)=>({...post(i+1,"approved",0)}));await abrir("/perfil");
        await esperar(()=>chrome.avaliar(`document.querySelector('.profileCover')?.dataset.medalha==='${medalha}'`),medalha);
        await captura(`banner-${medalha}`);
      }
    });
    await t.test("quatro ajustes preservam medalhas, cabeçalho, primeira trilha e busca remota", async () => {
      for(const largura of [390,1280]) {
        await chrome.viewport(largura,1000);
        await abrir('/medalhas');await esperar(()=>chrome.avaliar("document.querySelectorAll('.medalLevel').length===5"),'medalhas');
        assert.doesNotMatch(await texto(),/A API ainda não fornece/);await captura(`quatro-medalhas-${largura}`);
        db=[];await abrir('/perfil');await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.profileFirstPostLink'))"),'primeira trilha');
        assert.equal(await chrome.avaliar("document.querySelector('.profileFirstPostLink').getAttribute('href')"),'/trilhas/nova');
        await chrome.avaliar("document.querySelector('.profileFirstPostLink').focus()");await captura(`quatro-vazio-${largura}`);
        await chrome.avaliar("document.querySelector('.profileFirstPostLink').click()");await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.trilhaForm'))"),'formulário');
        db=[{...post(1),tipoLocal:'Cachoeira',autor:{...pessoa},createdAt:'2026-11-10T15:35:00Z'}, {...post(2,'pending'),tipoLocal:'Cachoeira'}, {...post(3,'rejected'),tipoLocal:'Cachoeira'}];
        for(const pagina of ['/trilhas','/perfil']) {
          await abrir(pagina);await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.postAuthor time'))"),'autor');
          const ordem=await chrome.avaliar("(()=>{const a=document.querySelector('.postAuthor'),t=document.querySelector('.postTitle,.profilePostHeader h3');return {antes:Boolean(a.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING),acima:a.getBoundingClientRect().bottom<=t.getBoundingClientRect().top,nome:a.textContent};})()");
          assert.equal(ordem.antes,true);assert.equal(ordem.acima,true);assert.match(ordem.nome,/@pessoa/);
          if(pagina==='/perfil') await chrome.avaliar("document.querySelector('.profilePostCard').scrollIntoView({block:'start'});window.scrollBy(0,-140)");
          await captura(`quatro-${pagina.slice(1)}-${largura}`);
        }
        await abrir('/trilhas');await esperar(()=>chrome.avaliar("document.querySelectorAll('.post').length===1"),'feed');
        const buscar=termo=>chrome.avaliar(`(()=>{const e=document.querySelector('.trailSearch input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(termo)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
        await buscar('CaChO');await esperar(()=>requests.some(r=>r.url.includes('busca=CaChO')),'busca no endpoint');
        await esperar(()=>chrome.avaliar("document.querySelectorAll('.post').length===1"),'resultado por característica');await captura(`quatro-busca-${largura}`);
        await buscar('inexistente');await esperar(async()=>(await texto()).includes('Nenhum resultado para'),'sem resultado');
        await buscar('');await esperar(()=>chrome.avaliar("document.querySelectorAll('.post').length===1"),'limpar busca');
        await chrome.avaliar("document.querySelector('.post').scrollIntoView({block:'center'})");
        await esperar(() => chrome.avaliar("document.querySelector('.postPhoto img')?.naturalWidth > 0"), "foto após limpar busca");
      }
    });
    await t.test("visitante é redirecionado em URLs internas diretas; documentos e cadastro permanecem públicos", async () => {
      logado = false;
      for (const path of ["/trilhas", "/perfil", "/trilhas/nova", `/trilhas/${id(1)}/editar`, "/admin", "/ajuda", "/medalhas", "/"]) {
        await abrir(path);await esperar(() => chrome.avaliar("location.pathname==='/login' && Boolean(document.getElementById('identificador'))"), "login obrigatório");assert.equal(await chrome.avaliar("document.querySelector('.productSidebar')===null"), true);
      }
      assert.deepEqual(requests.filter((r) => r.url.startsWith("/trilhas")).map((r) => r.url), []);
      for (const path of ["/cadastro", "/termos", "/privacidade"]) { await abrir(path);assert.equal(await chrome.avaliar("location.pathname"), path); }
      await navegar("/perfil");try { await esperar(() => chrome.avaliar("location.pathname==='/login' && Boolean(document.getElementById('identificador'))"), "entrada pelo navegador"); } catch (falha) { throw new Error(falha.message + JSON.stringify(await chrome.avaliar("({path:location.pathname,text:document.body.textContent.slice(0,500)})")) + chrome.diagnostico()); }await captura("acesso-deslogado");
    });
    await t.test("login retorna à página solicitada; usuário comum não acessa administração e admin acessa", async () => {
      logado = false;await abrir("/perfil");await esperar(() => chrome.avaliar("Boolean(document.getElementById('identificador'))"), "login");await login();await esperar(() => chrome.avaliar("location.pathname==='/perfil' && Boolean(document.getElementById('profile-name'))"), "retorno ao Perfil");
      await abrir("/admin");await esperar(() => chrome.avaliar("location.pathname==='/trilhas'"), "admin bloqueado");assert.equal(requests.some((r) => r.url === "/trilhas/pendentes"), false);assert.equal(await chrome.avaliar("document.querySelector('[aria-label=Administração]')===null"), true);for (const largura of [1280, 390]) { await chrome.viewport(largura, 1000);await captura(`usuario-comum-${largura}`); }
      usuario.perfil = "admin";await abrir("/admin");await esperar(async () => (await texto()).includes("Nenhuma publicação pendente"), "admin autorizado");assert.equal(await chrome.avaliar("Boolean(document.querySelector('[aria-label=Administração]'))"), true);for (const largura of [1280, 390]) { await chrome.viewport(largura, 1000);await captura(`administrador-${largura}`); }
    });
    await t.test("login respeita Retry-After, inclusive ao reabrir a tela", async () => {
      logado = false;
      modo.limiteLogin = true;
      await abrir("/login");
      await login();
      const bloqueado = () => chrome.avaliar("Boolean(document.querySelector('.authForm [type=submit]:disabled') && document.querySelector('[role=timer]'))");
      await esperar(bloqueado, "contador de login");
      assert.match(await texto(), /Você pode tentar novamente em [123] s/);
      await abrir("/login");
      assert.equal(await bloqueado(), true);
      await login();
      const enviosLogin = () => requests.filter((req) => req.url === "/usuarios/login").length;
      assert.equal(enviosLogin(), 1);
      modo.limiteLogin = false;
      await esperar(async () => !(await bloqueado()), "fim do bloqueio");
      await login();
      await esperar(() => chrome.avaliar("location.pathname === '/trilhas'"), "login após o bloqueio");
      assert.equal(enviosLogin(), 2);
    });
    await t.test("Feed navega dentro do cartão e abre ampliação somente ao clicar", async () => {
      db = [post(1, "approved", 3)];await chrome.viewport(1280, 1000);await abrir("/trilhas");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.postPhoto img')?.naturalWidth)"), "Feed");
      assert.equal(await chrome.avaliar("document.querySelector('dialog')===null && Boolean(document.querySelector('.post .photoOpenControl'))"),true);
      const primeira = await chrome.avaliar("document.querySelector('.postPhoto img').src");
      assert.match(primeira, /^blob:/);
      assert.equal(requests.filter(r=>r.url.endsWith('variante=detalhe')).length,1);
      await chrome.avaliar("document.querySelector('.carouselControls [aria-label=\"Próxima foto\"]').click();true");
      await esperar(()=>chrome.avaliar("document.querySelector('.carouselControls span')?.textContent==='2 de 3'"),"segunda foto");
      await esperar(() => chrome.avaliar("Boolean(document.querySelector('.postPhoto img')?.naturalWidth)"), "segunda foto carregada");
      await chrome.avaliar("document.querySelector('.feedCarousel').focus();true");await chrome.pressionarTecla('ArrowLeft');
      await esperar(()=>chrome.avaliar("document.querySelector('.carouselControls span')?.textContent==='1 de 3'"),"teclado");
      const medidas=await chrome.avaliar("(()=>{const p=document.querySelector('.post').getBoundingClientRect(),f=document.querySelector('.feed').getBoundingClientRect();return {razao:p.width/f.width,centro:Math.abs(p.left+p.width/2-f.left-f.width/2)};})()");
      assert.ok(Math.abs(medidas.razao-.75)<.01);assert.ok(medidas.centro<1);await captura('feed-carrossel-desktop');
      await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.post .photoOpenControl'))"),"foto pronta para ampliar");
      const detalhes = () => requests.filter((r) => r.url.endsWith("variante=detalhe")).length;
      assert.equal(detalhes(), 2);
      assert.equal(await chrome.avaliar("document.querySelector('.postPhoto img').src"), primeira);
      await chrome.avaliar("document.querySelector('.post .photoOpenControl').click();true");await modal("1 de 3");await fotoPronta();
      assert.equal(await chrome.avaliar("document.querySelector('dialog img').src"), primeira);
      await chrome.pressionarTecla('ArrowRight');await modal("2 de 3");await fotoPronta();await chrome.pressionarTecla('Escape');
      await esperar(()=>chrome.avaliar("!document.querySelector('dialog')"),"fechamento por Escape");
      assert.equal(await chrome.avaliar("document.querySelector('.carouselControls span').textContent"),"1 de 3");
      assert.equal(detalhes(), 2);
      await chrome.avaliar("document.querySelector('.productNav a[href=\"/perfil\"]').click()");
      await esperar(() => chrome.avaliar("Boolean(document.querySelector('.profilePage'))"), "Perfil");
      await chrome.avaliar("document.querySelector('.productNav a[href=\"/trilhas\"]').click()");
      await esperar(() => chrome.avaliar("Boolean(document.querySelector('.postPhoto img')?.naturalWidth)"), "Feed remontado");
      assert.equal(await chrome.avaliar("document.querySelector('.postPhoto img').src"), primeira);
      assert.equal(detalhes(), 2);
    });
    await t.test("carrossel aceita deslize real e preserva rolagem vertical no celular", async () => {
      db=[post(1,'approved',3)];await chrome.viewport(390,844);await abrir('/trilhas');await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.postPhoto img')?.naturalWidth)"),'Feed');
      const ponto=await chrome.avaliar("(async()=>{const e=document.querySelector('.carouselStage');e.scrollIntoView({block:'center'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const b=e.getBoundingClientRect();return {x:b.left+b.width*.7,y:b.top+b.height/2,fim:b.left+b.width*.3};})()");
      await chrome.deslizar(ponto.x,ponto.y,ponto.fim);await esperar(()=>chrome.avaliar("document.querySelector('.carouselControls span')?.textContent==='2 de 3'"),'deslize');
      assert.equal(await chrome.avaliar("getComputedStyle(document.querySelector('.carouselStage')).touchAction"),'pan-y pinch-zoom');
      assert.equal(await chrome.avaliar("document.querySelector('dialog')===null"),true);await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.postPhoto img')?.naturalWidth)"),'imagem após deslize');await captura('feed-carrossel-mobile');
      for(const largura of [390,768,1280]){await chrome.viewport(largura,1000);assert.equal(await chrome.avaliar("document.documentElement.scrollWidth>innerWidth"),false);}
    });
    await t.test("Perfil reutiliza detalhes privados na galeria e revoga suas URLs no logout", async () => {
      db = [post(2, "pending", 3)];db[0].fotos[2].legada = true;await abrir("/perfil");await esperar(() => chrome.avaliar("document.querySelectorAll('.profilePostPhoto').length===3"), "Perfil");
      await chrome.avaliar("document.querySelectorAll('.profilePostPhoto .photoOpenControl')[1].click();true");await modal("2 de 3");await fotoPronta();const url = await chrome.avaliar("document.querySelector('dialog img').src");assert.match(url, /^blob:/);
      assert.ok(requests.some((r) => r.url.includes("/trilhas/minhas/") && r.url.endsWith("variante=detalhe") && r.headers.cookie.includes("synthetic=1")));
      await clicar("← Anterior", "dialog");await modal("1 de 3");await fotoPronta();assert.equal(await chrome.avaliar(`window.urls.revogadas.includes(${JSON.stringify(url)})`), false);await captura("galeria-perfil");await chrome.viewport(390, 844);await captura("galeria-perfil-mobile");await chrome.viewport(1280, 1000);
      const antes = requests.length;
      await clicar("Próxima →", "dialog");await modal("2 de 3");await fotoPronta();
      assert.equal(await chrome.avaliar("document.querySelector('dialog img').src"), url);
      await clicar("Próxima →", "dialog");await modal("3 de 3");await esperar(async () => (await texto()).includes("Foto indisponível."), "legada");
      assert.equal(requests.length, antes);await fechar();await captura("perfil-multiplas-fotos");
      await clicar("Sair", ".productNav");
      await esperar(() => chrome.avaliar("Boolean(document.getElementById('identificador'))"), "logout");
      await esperar(() => chrome.avaliar(`window.urls.revogadas.includes(${JSON.stringify(url)})`), "revogação da URL privada");
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
      await abrir("/trilhas/nova");await esperar(() => chrome.avaliar("Boolean(document.getElementById('titulo'))"), "cadastro");await escrever("titulo", "Nova trilha com fotos");await escrever("descricao", "Descrição da nova trilha");await escrever("endereco", "Local novo");await selecionar("#fotos-publicacao", ["um.png", "dois.png"]);await chrome.avaliar("document.querySelector('.trilhaForm').requestSubmit()");await esperar(async () => (await texto()).includes("2 fotos com envio confirmado"), "uploads concluídos");await clicar("Ver minhas publicações");await esperar(() => chrome.avaliar("document.querySelectorAll('.profilePostPhoto img').length===2"), "fotos no Perfil");await captura("publicacao-criada");await chrome.viewport(390, 1000);await captura("publicacao-criada-mobile");await chrome.viewport(1280, 1000);assert.equal(db[0].status, "pending");
      await abrir("/trilhas");await esperar(async () => (await texto()).includes("Nenhuma trilha cadastrada"), "Feed sem pendente");usuario.perfil = "admin";await abrir("/admin");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.adminPostCard'))"), "moderação");await clicar("Aprovar");await esperar(async () => (await texto()).includes("Publicação aprovada."), "aprovação");await abrir("/trilhas");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.postPhoto img')?.naturalWidth)"), "Feed com fotos aprovadas");assert.match(await texto(), /Nova trilha com fotos/);assert.equal(db[0].status, "approved");
    });
    await t.test("continua o envio ao navegar e só mostra a trilha completa na fila do Admin", async () => {
      usuario.perfil = "admin";
      modo.holdUpload = true;
      await chrome.viewport(1440, 1000);
      await abrir("/trilhas/nova");
      await esperar(() => chrome.avaliar("Boolean(document.getElementById('titulo'))"), "cadastro");
      await escrever("titulo", "Trilha com envio em andamento");
      await escrever("descricao", "Descrição de teste");
      await escrever("endereco", "Destino sintético");
      await selecionar("#fotos-publicacao", ["um.png", "dois.png"]);
      await chrome.avaliar("document.querySelector('.trilhaForm').requestSubmit()");
      await esperar(() => pendentes.length === 1, "primeiro upload");
      assert.equal(db[0].fotosPrevistas, 2);
      await clicar("Ver minhas publicações");
      await esperar(() => chrome.avaliar("location.pathname === '/perfil' && Boolean(document.querySelector('.profilePostCard'))"), "navegação durante o envio");
      await chrome.avaliar("document.querySelector('.productNav a[href=\"/admin\"]').click()");
      await esperar(async () => (await texto()).includes("Nenhuma publicação pendente"), "fila sem envio incompleto");
      assert.equal(await chrome.avaliar("document.querySelector('.adminPostCard') === null"), true);
      modo.holdUpload = false;
      pendentes.shift()();
      await esperar(() => db[0].fotos.length === 2, "envios concluídos em outra tela");
      await esperar(() => chrome.avaliar("document.querySelectorAll('.adminPostCard .adminPhoto img').length === 2"), "fotos na fila");
      assert.equal(await chrome.avaliar("[...document.querySelectorAll('.adminPhoto')].every(foto => foto.getBoundingClientRect().width <= 160)"), true);
    });
    await t.test("avatares das publicações têm tamanho ampliado e preservam contorno e exceções", async () => {
      usuario.fotoPerfil=origem+'/__avatar.png';db=[{...post(1),autor:{...usuario}}];
      for(const largura of [1280,390]) {
        await chrome.viewport(largura,1000);
        for(const pagina of ['/trilhas','/perfil']) {
          await abrir(pagina);await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.postAuthor img')?.naturalWidth)"),'avatar');
          const avatar=await chrome.avaliar("(()=>{const e=document.querySelector('.postAuthor img'),s=getComputedStyle(e),r=e.getBoundingClientRect();return {cor:s.outlineColor,espessura:s.outlineWidth,estilo:s.outlineStyle,offset:s.outlineOffset,raio:s.borderRadius,w:r.width,h:r.height};})()");
          assert.deepEqual(avatar,{cor:'rgb(104, 188, 152)',espessura:'2px',estilo:'solid',offset:'-2px',raio:'50%',w:45,h:45});
          assert.equal(await chrome.avaliar("[...document.querySelectorAll('.sidebarAccount img,.profileAvatar img,.postPhoto img')].every(e=>getComputedStyle(e).outlineStyle==='none' && !e.classList.contains('userAvatarOutline'))"),true);
        }
        await clicar('Editar perfil');await selecionar('#editar-foto-perfil input[type=file]',['avatar.png']);await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.avatarCropCanvas'))"),'recorte');
        assert.deepEqual(await chrome.avaliar("(()=>{const s=getComputedStyle(document.querySelector('.avatarCropFrame'));return [s.borderTopColor,s.borderTopWidth];})()"),['rgb(104, 188, 152)','2px']);
      }
    });
    await t.test("avatar tem prévia, upload único, atualiza Perfil/Sidebar e persiste em novo login", async () => {
      await chrome.viewport(1280, 1000);await abrir("/perfil");await clicar("Editar perfil");await selecionar('#editar-foto-perfil input[type=file]', ["avatar.png"]);await esperar(() => chrome.avaliar("Boolean(document.querySelector('#editar-foto-perfil .avatarCropCanvas')?.width)"), "prévia");
      modo.holdAvatar = true;await clicar("Salvar foto");await esperar(() => pendentes.length === 1, "upload retido");assert.match(await texto(), /Enviando foto/);const upload = requests.find((r) => r.url === "/usuarios/me/foto-perfil");assert.equal(upload.method, "PUT");assert.match(upload.headers["content-type"], /^multipart\/form-data; boundary=/);assert.match(upload.body, /name="imagem"/);assert.equal(upload.headers["x-csrf-token"], "csrf-sintetico");
      pendentes.shift()();await esperar(async () => (await texto()).includes("Foto de perfil atualizada."), "confirmação");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.profileAvatar img')?.naturalWidth && document.querySelector('.sidebarAccount img')?.naturalWidth)"), "avatar atualizado");const url = usuario.fotoPerfil;await captura("avatar-atualizado");await chrome.viewport(390, 1000);assert.equal(await chrome.avaliar("document.documentElement.scrollWidth>innerWidth"), false);await captura("avatar-atualizado-mobile");await chrome.viewport(1280, 1000);
      await clicar("Sair", ".productNav");await esperar(() => chrome.avaliar("Boolean(document.getElementById('identificador'))"), "logout");await login();await esperar(() => chrome.avaliar(`Boolean(document.querySelector('.sidebarAccount img')) && document.querySelector('.sidebarAccount img').src===${JSON.stringify(url)}`), "avatar após login novo");await abrir("/perfil");await esperar(() => chrome.avaliar(`document.querySelector('.profileAvatar img')?.src===${JSON.stringify(url)}`), "persistência via sessão");await navegar("/perfil");await esperar(() => chrome.avaliar(`document.querySelector('.profileAvatar img')?.src===${JSON.stringify(url)}`), "persistência ao recarregar");
    });
    await t.test("avatar inválido ou falha remota não anuncia sucesso nem altera foto salva", async () => {
      await abrir("/perfil");await clicar("Editar perfil");for (const [tipo, tamanho] of [["image/svg+xml", 10], ["image/png", 5242881]]) { await selecionar('#editar-foto-perfil input[type=file]', ["invalida"], tipo, tamanho);assert.equal(requests.some((r) => r.url === "/usuarios/me/foto-perfil"), false); }
      await selecionar('#editar-foto-perfil input[type=file]', ["valida.png"]);await esperar(()=>chrome.avaliar("Boolean(document.querySelector('#editar-foto-perfil button[type=submit]:not(:disabled)'))"),"foto pronta para salvar");modo.falhaAvatar = true;await clicar("Salvar foto");await esperar(async () => (await texto()).includes("Upload do avatar indisponível."), "erro upload");assert.equal(usuario.fotoPerfil, null);assert.doesNotMatch(await texto(), /Foto de perfil atualizada\./);
    });
    await t.test("remoção do avatar exige confirmação e preserva a foto em caso de erro", async () => {
      usuario.fotoPerfil = origem + "/__avatar.png";
      await abrir("/perfil");
      await clicar("Editar perfil");
      const remover = (confirmado) => chrome.avaliar(`(() => {
        const confirmacao = window.confirm;
        window.confirm = () => ${confirmado};
        try {
          [...document.querySelectorAll('#editar-foto-perfil button')].find(b => b.textContent === 'Remover foto de perfil').click();
        } finally { window.confirm = confirmacao; }
      })()`);
      const avatarVisivel = () => chrome.avaliar("Boolean(document.querySelector('.profileAvatar img') && document.querySelector('.sidebarAccount img'))");
      const remocoes = () => requests.filter((req) => req.url === "/usuarios/me/foto-perfil" && req.method === "DELETE");
      await remover(false);
      assert.equal(remocoes().length, 0);
      modo.falhaRemocaoAvatar = true;
      await remover(true);
      await esperar(async () => (await texto()).includes("Remoção do avatar indisponível."), "falha da remoção");
      assert.equal(await avatarVisivel(), true);
      assert.doesNotMatch(await texto(), /Foto de perfil removida\./);
      modo.falhaRemocaoAvatar = false;
      await remover(true);
      await esperar(async () => (await texto()).includes("Foto de perfil removida."), "confirmação da remoção");
      assert.equal(await avatarVisivel(), false);
      assert.deepEqual(remocoes().map((req) => req.headers["x-csrf-token"]), ["csrf-sintetico", "csrf-sintetico"]);
      await abrir("/perfil");
      assert.equal(usuario.fotoPerfil, null);
      assert.equal(await avatarVisivel(), false);
    });
    await t.test("avatar fica dentro de Editar perfil, ajusta zoom e arraste e envia recorte circular real sem ampliar pixels", async () => {
      await chrome.viewport(1280,1000);await abrir("/perfil");assert.equal(await chrome.avaliar("[...document.querySelectorAll('.profileIdentity button')].some(b=>b.textContent==='Alterar foto')"),false);
      await clicar("Editar perfil");assert.equal(await chrome.avaliar("Boolean(document.querySelector('#editar-perfil #editar-foto-perfil'))"),true);
      await selecionar('#editar-foto-perfil input[type=file]',["rosto.png"]);await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.avatarCropCanvas'))"),"recorte");
      await chrome.avaliar("(()=>{const e=document.querySelector('[aria-label=\"Zoom da foto\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'2');e.dispatchEvent(new Event('input',{bubbles:true}));})()");
      await esperar(()=>chrome.avaliar("document.querySelector('[aria-label=\"Zoom da foto\"]').value==='2'"),"zoom");
      const ponto=await chrome.avaliar("(async()=>{const e=document.querySelector('.avatarCropCanvas');e.scrollIntoView({block:'center'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()");
      await chrome.deslizar(ponto.x,ponto.y,ponto.x+35);await esperar(()=>chrome.avaliar("Number(document.querySelector('[aria-label=\"Posição horizontal\"]').value)!==0"),"arraste real");
      await captura("avatar-recorte-desktop");await chrome.viewport(390,1000);await captura("avatar-recorte-mobile");await chrome.viewport(1280,1000);
      modo.holdAvatar=true;await clicar("Salvar foto");await esperar(()=>pendentes.length===1,"upload recortado");
      assert.equal(await chrome.avaliar("[...document.querySelectorAll('#editar-perfil > form button')].every(b=>b.disabled)"),true);
      const recorte=await chrome.avaliar("(async()=>{const f=window.ultimoAvatar,b=await createImageBitmap(f),c=document.createElement('canvas');c.width=b.width;c.height=b.height;const x=c.getContext('2d');x.drawImage(b,0,0);const r={width:b.width,height:b.height,tipo:f.type,nome:f.name,canto:x.getImageData(0,0,1,1).data[3],centro:x.getImageData(Math.floor(b.width/2),Math.floor(b.height/2),1,1).data[3]};b.close();return r;})()");
      assert.equal(recorte.width,90);assert.equal(recorte.height,90);assert.equal(recorte.tipo,"image/png");assert.equal(recorte.nome,"avatar-recortado.png");assert.equal(recorte.canto,0);assert.equal(recorte.centro,255);
      pendentes.shift()();await esperar(async()=>(await texto()).includes("Foto de perfil atualizada."),"confirmação");
    });
    await t.test("carrossel usa detalhe somente na foto ativa e preserva botões administrativos",async()=>{
      db=[post(1)];await chrome.viewport(1280,1000);await abrir('/trilhas');await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.postPhoto img')?.naturalWidth)"),'foto ativa');
      assert.equal(requests.filter(r=>r.url.endsWith('variante=detalhe')).length,1);
      assert.equal(await chrome.avaliar("document.querySelector('.postPhoto img').naturalWidth"),1280);
      assert.equal(await chrome.avaliar("document.querySelector('dialog')===null"),true);
      await abrir('/perfil');await esperar(()=>chrome.avaliar("[...document.querySelectorAll('.profilePostPhoto img')].length===2 && [...document.querySelectorAll('.profilePostPhoto img')].every(e=>e.naturalWidth>0)"),"prévia privada");
      assert.equal(await chrome.avaliar("[...document.querySelectorAll('.profilePostPhoto img')].every(e=>{const b=e.getBoundingClientRect();return b.width<=e.naturalWidth&&b.height<=e.naturalHeight;})"),true);
      usuario.perfil='admin';db=[post(2,'pending')];await abrir('/admin');await esperar(()=>chrome.avaliar("Boolean(document.querySelector('.adminDecisionButtons'))"),"admin");
      for(const largura of [1280,390]){await chrome.viewport(largura,1000);const m=await chrome.avaliar("(()=>{const e=document.querySelector('.adminDecisionButtons button');return {raio:parseFloat(getComputedStyle(e).borderRadius),altura:e.getBoundingClientRect().height};})()");assert.ok(m.raio>=10);assert.ok(m.altura>=44);await captura(`admin-botoes-${largura}`);}
    });
    await t.test("confirmação de publicação destaca análise e organiza nomes longos sem transbordar",async()=>{
      await abrir('/trilhas/nova');await esperar(()=>chrome.avaliar("Boolean(document.getElementById('titulo'))"),"formulário");await escrever('titulo','Trilha registrada');await escrever('descricao','Registro completo');await escrever('endereco','Local sintético');
      await selecionar('#fotos-publicacao',['nome-muito-longo-'.repeat(35)+'.png','segunda.png']);await chrome.avaliar("document.querySelector('.trilhaForm').requestSubmit()");await esperar(async()=>(await texto()).includes('2 fotos com envio confirmado'),"fotos confirmadas");
      assert.match(await texto(),/Aguardando aprovação administrativa/);assert.equal(db[0].status,'pending');
      for(const largura of [1280,390]){await chrome.viewport(largura,1000);const m=await chrome.avaliar("(()=>{const e=document.querySelector('.publicationFileInfo > span');return {cortado:e.scrollWidth>e.clientWidth,overflow:getComputedStyle(e).textOverflow,pagina:document.documentElement.scrollWidth>innerWidth};})()");assert.equal(m.cortado,true);assert.equal(m.overflow,'ellipsis');assert.equal(m.pagina,false);await captura(`publicacao-concluida-${largura}`);}
    });
    await t.test("layout e tipografia preservam ícones e proporção em diferentes tamanhos", async () => {
      db = [post(1)];for (const largura of [390, 768, 1280]) { await chrome.viewport(largura, 1000);await abrir("/trilhas");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.postText'))"), "Feed");assert.equal(await chrome.avaliar("document.documentElement.scrollWidth>innerWidth"), false);await captura(`feed-${largura}`);await abrir("/perfil");await esperar(() => chrome.avaliar("Boolean(document.querySelector('.profilePostCard'))"), "Perfil");assert.equal(await chrome.avaliar("document.documentElement.scrollWidth>innerWidth"), false);await captura(`perfil-${largura}`); }
      const medidas = await chrome.avaliar("({texto:parseFloat(getComputedStyle(document.querySelector('.profilePostCard > p')).fontSize),icone:document.querySelector('.navIcon').getBoundingClientRect().width})");assert.ok(medidas.texto >= 14);assert.ok(medidas.icone < 20);
      await chrome.avaliar("ocultar()");await esperar(() => chrome.avaliar("document.querySelector('main')===null"), "desmontagem final");const urls = await chrome.avaliar("window.urls");assert.deepEqual([...urls.criadas].sort(), [...urls.revogadas].sort());
    });
  } finally { pendentes.splice(0).forEach((fn) => fn());try { await chrome?.fechar(); } finally { try { await servidor?.close(); } finally { await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } } }
});
