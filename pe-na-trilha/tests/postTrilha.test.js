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
const id = "000000000000000000000001";
const fotoId = "000000000000000000000002";
const outraFotoId = "000000000000000000000003";
const fotoErroId = "000000000000000000000004";
const caminho = (foto = fotoId) => `/trilhas/${id}/fotos/${foto}/conteudo`;
const publicacao = (fotos = [{ _id: fotoId, url: caminho() }]) => ({
  _id: id, titulo: "Trilha sintética", descricao: "Descrição preservada no Feed.",
  endereco: "Local sintético", status: "approved", fotos,
});
// PNG de 1 pixel, exclusivamente sintético: exercita load do img; este componente
// não valida formato binário. O serviço privado aprovado tem seus próprios testes.
const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a95sAAAAASUVORK5CYII=", "base64");
const entrada = `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { MemoryRouter } from 'react-router-dom';
  import AuthContext from '/src/contexts/authContextValue.js';
  import api from '/src/services/api.js';
  import PostTrilha from '/src/components/PostTrilha.jsx';
  import '/src/styles/post.css';
  import '/src/styles/product.css';
  api.defaults.baseURL = location.origin + '/prefixo-ignorado';
  const root = createRoot(document.getElementById('root'));
  window.ocultarPost = () => root.render(null);
  window.renderPost = (trilha) => root.render(React.createElement(MemoryRouter, null,
    React.createElement(AuthContext.Provider, { value: { usuario: null } },
      React.createElement(PostTrilha, { trilha, onDelete() {}, excluindo: false }))));
`;
async function esperar(condicao, descricao) {
  const fim = Date.now() + 10000;
  while (Date.now() < fim) { if (await condicao()) return; await new Promise((resolve) => setTimeout(resolve, 20)); }
  throw new Error(`Timeout aguardando ${descricao}`);
}

test("PostTrilha: integração visual das fotos públicas em navegador", {
  skip: !chromeDisponivel && "Chrome local ausente; configure PNT_CHROME_BIN para executar os testes visuais.", timeout: 60000,
}, async (t) => {
  const temporario = await mkdtemp(join(tmpdir(), "pnt-feed-test-"));
  const requisicoes = [], respostasPendentes = [], modos = new Map(), respostasAtivas = new Set();
  const virtual = "\0pnt-feed-test.jsx";
  let chrome, servidor;
  try {
    servidor = await createServer({
      root, configFile: false, cacheDir: join(temporario, "vite"), plugins: [react(), {
        name: "feed-synthetic-test-only",
        resolveId(id) { if (id === "/__feed_test_entry.jsx") return virtual; },
        load(id) { if (id === virtual) return entrada; },
        configureServer(vite) {
          vite.middlewares.use(async (req, res, next) => {
            if (req.url === "/__feed_test") {
              const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/__feed_test_entry.jsx"></script></body></html>';
              res.setHeader("Content-Type", "text/html"); res.end(html); return;
            }
            if (req.url.startsWith("/trilhas/") || req.url.startsWith("/admin/trilhas/")) {
              requisicoes.push(req.url);
              respostasAtivas.add(res);
              res.once("close", () => respostasAtivas.delete(res));
              const modo = modos.get(req.url.split("?")[0]) || "sucesso";
              const responder = () => {
                if (res.destroyed) return;
                res.setHeader("Cache-Control", "no-store");
                if (modo === "erro" || modo === "aguardarErro") { res.statusCode = 404; res.end(); }
                else { res.setHeader("Content-Type", "image/png"); res.end(pixel); }
              };
              if (modo.startsWith("aguardar")) respostasPendentes.push(responder); else responder();
              return;
            }
            next();
          });
        },
      }], server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, logLevel: "error",
    });
    await servidor.listen();
    const origem = `http://127.0.0.1:${servidor.httpServer.address().port}`;
    assert.match(await (await fetch(origem + "/__feed_test")).text(), /__feed_test_entry/);
    chrome = await abrirChrome(join(temporario, "chrome"));
    await chrome.navegar(origem + "/__feed_test");
    try { await esperar(() => chrome.avaliar("typeof window.renderPost === 'function'"), "entrada React"); }
    catch (erro) { throw new Error(`${erro.message}\n${chrome.diagnostico()}\n${await chrome.avaliar("JSON.stringify({url:location.href,html:document.documentElement.outerHTML,recursos:performance.getEntriesByType('resource').map(x=>x.name)})")}`); }
    const render = async (dados) => {
      await chrome.avaliar(`window.renderPost(${JSON.stringify(dados)})`);
      await esperar(() => chrome.avaliar(`document.querySelector('.postTitle')?.textContent === ${JSON.stringify(dados.titulo)}`), "cartão");
    };
    const estado = () => chrome.avaliar(`(() => {
      const figura = document.querySelector('.postPhoto'); const img = figura?.querySelector('img');
      return { src: img?.src || null, busy: figura?.getAttribute('aria-busy'), texto: (document.querySelector(".feedCarousel") || figura)?.textContent,
        classe: figura?.className, loading: img?.loading, largura: figura?.getBoundingClientRect().width,
        altura: figura?.getBoundingClientRect().height, descricao: document.querySelector('.postText')?.textContent };
    })()`);

    await t.test("usa origem da API e detalhe ativo; mantém espaço, legenda de carregamento e contador", async () => {
      modos.set(caminho(), "aguardar");
      await render(publicacao([{ _id: fotoId, url: caminho() }, { _id: outraFotoId, url: caminho(outraFotoId) }]));
      await esperar(() => respostasPendentes.length > 0, "request da miniatura");
      const inicial = await estado();
      assert.equal(inicial.src, origem + caminho() + "?variante=detalhe");
      assert.equal(inicial.busy, "true"); assert.match(inicial.texto, /Carregando foto/);
      assert.match(inicial.texto, /1 de 2/); assert.equal(inicial.loading, "lazy");
      assert.ok(inicial.largura > 0 && inicial.altura > 0);
      respostasPendentes.shift()();
      await esperar(async () => (await estado()).busy === "false", "load da imagem");
      const carregada = await estado();
      assert.ok(carregada.src); assert.doesNotMatch(carregada.texto, /Carregando/);
      assert.equal(carregada.altura, inicial.altura); assert.equal(carregada.largura, inicial.largura);
      assert.equal(requisicoes.filter(url => url.endsWith("variante=detalhe")).length, 1); // Detalhe somente da foto ativa.
    });
    await t.test("nenhuma foto e legado null não criam img nem novas requisições", async () => {
      const antes = requisicoes.length;
      await render({ ...publicacao([]), titulo: "Sem foto" });
      assert.equal((await estado()).src, null); assert.match((await estado()).texto, /Nenhuma foto cadastrada/);
      await render({ ...publicacao([{ _id: fotoId, url: null }]), titulo: "Legada" });
      assert.equal((await estado()).src, null); assert.match((await estado()).texto, /Foto indisponível/);
      assert.equal(requisicoes.length, antes);
    });
    await t.test("caminhos privados, URL Cloudinary e URL inválida não derrubam o cartão", async () => {
      const antes = requisicoes.length;
      for (const url of ["https://res.cloudinary.com/synthetic/image/upload/foto.webp", `/trilhas/minhas/${id}/fotos/${fotoId}/conteudo`,
        `/admin/trilhas/${id}/fotos/${fotoId}/conteudo`, "invalid"]) {
        await render({ ...publicacao([{ _id: fotoId, url }]), titulo: "Inválida " + url });
        const atual = await estado(); assert.equal(atual.src, null); assert.match(atual.texto, /Foto indisponível/);
        assert.equal(atual.descricao, "Descrição preservada no Feed.");
      }
      assert.equal(requisicoes.length, antes);
    });
    await t.test("erro preserva área e proporção do carregamento e sucesso no desktop e mobile", async () => {
      modos.delete(caminho());modos.delete(caminho(outraFotoId));
      for (const largura of [1280, 390]) {
        await chrome.viewport(largura);
        const foto = largura === 1280 ? fotoErroId : "000000000000000000000007";
        modos.set(caminho(foto), "aguardarErro");
        await render({ ...publicacao([{ _id: foto, url: caminho(foto) }]), titulo: `Falha remota ${largura}` });
        await esperar(() => respostasPendentes.length > 0, "request antes do erro");
        const inicial = await estado(); assert.equal(inicial.busy, "true");
        respostasPendentes.shift()();
        await esperar(async () => (await estado()).texto.includes("Não foi possível"), "onError");
        const atual = await estado();
        assert.equal(atual.src, null); assert.equal(atual.busy, "false");
        assert.equal(atual.classe, "postPhoto");
        assert.equal(atual.altura, inicial.altura); assert.equal(atual.largura, inicial.largura);
        assert.ok(atual.altura > 0 && atual.altura <= 320);
        assert.equal(atual.descricao, "Descrição preservada no Feed.");
        // Compara também sucesso com erro no mesmo viewport e largura de cartão.
        const fotoSucesso = largura === 1280 ? "000000000000000000000008" : "000000000000000000000009";
        await render({ ...publicacao([{ _id: fotoSucesso, url: caminho(fotoSucesso) }]), titulo: `Sucesso ${largura}` });
        await esperar(async () => (await estado()).busy === "false", "sucesso comparável");
        const sucesso = await estado(); assert.ok(sucesso.src);
        assert.equal(sucesso.altura, atual.altura); assert.equal(sucesso.largura, atual.largura);
      }
      await chrome.viewport(1280);
      // Mantém a regressão de troca diretamente de uma foto que falhou.
      modos.set(caminho(fotoErroId), "erro");
      await render({ ...publicacao([{ _id: fotoErroId, url: caminho(fotoErroId) }]), titulo: "Erro antes da troca" });
      await esperar(async () => (await estado()).texto.includes("Não foi possível"), "erro antes da troca");
    });
    await t.test("troca de foto reinicia carregamento e não herda erro anterior", async () => {
      modos.set(caminho(outraFotoId), "aguardar");
      await render({ ...publicacao([{ _id: outraFotoId, url: caminho(outraFotoId) }]), titulo: "Outra foto" });
      await esperar(() => respostasPendentes.length > 0, "novo request");
      const inicial = await estado(); assert.equal(inicial.busy, "true"); assert.match(inicial.texto, /Carregando/);
      assert.doesNotMatch(inicial.texto, /Não foi possível/);
      respostasPendentes.shift()();
      await esperar(async () => (await estado()).busy === "false", "nova imagem");
      assert.equal((await estado()).src, origem + caminho(outraFotoId) + "?variante=detalhe");
    });
    await t.test("renderizações com mesma URL reutilizam img sem novas requisições", async () => {
      const foto = "000000000000000000000005";
      const fotos = [{ _id: foto, url: caminho(foto) }, { _id: outraFotoId, url: caminho(outraFotoId) }];
      const antes = requisicoes.length; modos.delete(caminho(outraFotoId)); modos.set(caminho(foto), "aguardar");
      await render({ ...publicacao(fotos), titulo: "Mesma URL inicial" });
      await esperar(() => respostasPendentes.length > 0, "request único");
      await chrome.avaliar("window.imagemOriginal = document.querySelector('.postPhoto img'); true");
      for (const fase of ["carregando", "carregada"]) {
        if (fase === "carregada") {
          respostasPendentes.shift()();
          await esperar(async () => (await estado()).busy === "false", "load antes de repetir render");
        }
        for (let i = 0; i < 4; i++) {
          await render({ ...publicacao(fotos.map((item) => ({ ...item }))), titulo: `Mesma URL ${fase} ${i}` });
          assert.equal(await chrome.avaliar("document.querySelector('.postPhoto img') === window.imagemOriginal"), true);
          assert.match((await estado()).texto, /1 de 2/);
          assert.equal(requisicoes.length, antes + 2);
        }
      }
      await chrome.avaliar("delete window.imagemOriginal");
    });
    await t.test("autor e ampliação preservam o carrossel em desktop e celular", async () => {
      modos.delete(caminho());modos.delete(caminho(outraFotoId));
      for (const largura of [1280, 390]) {
        await chrome.viewport(largura);
        await render({ ...publicacao([{ _id: fotoId, url: caminho() }, { _id: outraFotoId, url: caminho(outraFotoId) }]), autor: { nomeCompleto: "Ana Silva", nomeUsuario: "ana" } });
        await esperar(() => chrome.avaliar("Boolean(document.querySelector('.photoOpenControl'))"), "controle de ampliação");
        assert.match(await chrome.avaliar("document.querySelector('.postAuthor').textContent"), /Ana Silva.*@ana/);
        await chrome.avaliar("document.querySelector('.photoOpenControl').click()");
        await esperar(() => chrome.avaliar("Boolean(document.querySelector('dialog[open]'))"), "galeria aberta");
        await chrome.avaliar("document.querySelector('.galleryNavigation button:last-child').click()");
        await esperar(() => chrome.avaliar("document.querySelector('.galleryHeader').textContent.includes('2 de 2')"), "segunda foto");
        await chrome.avaliar("document.querySelector('[aria-label=\"Fechar fotos\"]').click()");
        await esperar(() => chrome.avaliar("!document.querySelector('dialog')"), "galeria fechada");
        assert.equal(await chrome.avaliar("document.querySelector('.carouselControls span').textContent"), "1 de 2");
      }
    });
    await t.test("desmontagem durante carregamento não recria cartão nem dispara novas requisições", async () => {
      const foto = "000000000000000000000006", antes = requisicoes.length;
      modos.set(caminho(foto), "aguardar");
      await render({ ...publicacao([{ _id: foto, url: caminho(foto) }]), titulo: "Desmontagem" });
      await esperar(() => respostasPendentes.length > 0, "imagem pendente antes da desmontagem");
      assert.equal((await estado()).busy, "true");
      await chrome.avaliar("window.ocultarPost()");
      await esperar(() => chrome.avaliar("document.querySelector('.post') === null"), "desmontagem do cartão");
      const diagnostico = chrome.diagnostico();
      respostasPendentes.shift()();
      await esperar(() => respostasAtivas.size === 0, "encerramento da resposta da imagem");
      await chrome.avaliar("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      assert.equal(await chrome.avaliar("document.querySelector('.post') === null && document.querySelector('img') === null"), true);
      assert.equal(chrome.diagnostico(), diagnostico);
      assert.equal(requisicoes.length, antes + 1);
    });
  } finally {
    respostasPendentes.splice(0).forEach((responder) => responder());
    await chrome?.fechar(); await servidor?.close();
    await rm(temporario, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
