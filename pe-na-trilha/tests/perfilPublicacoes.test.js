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
const usuario = { _id: "000000000000000000000010", nomeCompleto: "Pessoa Sintética", nomeUsuario: "pessoa", email: "pessoa@example.invalid" };
const id = (n) => n.toString(16).padStart(24, "0");
const fotoUrl = (post, foto) => `/trilhas/minhas/${post}/fotos/${foto}/conteudo`;
const post = (n, status, fotos = []) => ({ _id: id(n), status, proprietario: usuario._id,
  titulo: `Publicação ${status}`, descricao: "Descrição sintética.", endereco: "Local sintético", fotos });
const foto = (postId, n) => ({ _id: id(n), url: fotoUrl(postId, id(n)), updatedAt: "2026-11-13T12:00:00.000Z" });
const entrada = `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { MemoryRouter } from 'react-router-dom';
  import AuthContext from '/src/contexts/authContextValue.js';
  import api from '/src/services/api.js';
  import Perfil from '/src/pages/Perfil.jsx';
  import '/src/styles/product.css';
  api.defaults.baseURL = location.origin;
  const root = createRoot(document.getElementById('root'));
  window.renderPerfil = (usuario) => root.render(React.createElement(MemoryRouter, null,
    React.createElement(AuthContext.Provider, {value:{usuario}}, React.createElement(Perfil))));
  window.ocultarPerfil = () => root.render(null);
  const criar = URL.createObjectURL.bind(URL), revogar = URL.revokeObjectURL.bind(URL);
  window.urlsPerfil = {criadas:[],revogadas:[]};
  URL.createObjectURL = (blob) => { const url = criar(blob); window.urlsPerfil.criadas.push(url); return url; };
  URL.revokeObjectURL = (url) => { window.urlsPerfil.revogadas.push(url); return revogar(url); };
`;
async function esperar(condicao, nome) {
  const fim = Date.now() + 10000;
  while (Date.now() < fim) { if (await condicao()) return; await new Promise((resolve) => setTimeout(resolve, 20)); }
  throw new Error(`Timeout: ${nome}`);
}

test("Perfil: publicações próprias e ciclo de vida das imagens privadas no navegador", {
  skip: !chromeDisponivel && "Chrome local ausente; configure PNT_CHROME_BIN.", timeout: 120000,
}, async (t) => {
  const temporario = await mkdtemp(join(tmpdir(), "pnt-profile-test-"));
  const requisicoes = [], pendentesLista = [], pendentesFoto = [], modosFoto = new Map();
  let modoLista = { data: [] }, pixel, chrome, servidor, refreshes = 0;
  try {
    servidor = await createServer({ root, configFile: false, cacheDir: join(temporario, "vite"), logLevel: "error",
      server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, plugins: [react(), {
        name: "profile-synthetic-test-only",
        resolveId(id) { if (id === "/__perfil_entry.jsx") return "\0perfil-test.jsx"; },
        load(id) { if (id === "\0perfil-test.jsx") return entrada; },
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            const pathname = req.url.split("?")[0];
            if (pathname === "/__perfil") {
              res.setHeader("Content-Type", "text/html");
              res.setHeader("Set-Cookie", "synthetic_session=1; HttpOnly; Path=/; SameSite=Lax");
              res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/__perfil_entry.jsx"></script></body></html>'); return;
            }
            if (!pathname.startsWith("/trilhas") && pathname !== "/usuarios/refresh" && !pathname.startsWith("/admin/trilhas")) return next();
            requisicoes.push({ url: req.url, method: req.method, cookie: req.headers.cookie });
            res.setHeader("Cache-Control", "private, no-store");
            if (pathname === "/usuarios/refresh") {
              refreshes++; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ usuario })); return;
            }
            if (pathname === "/trilhas/minhas") {
              const modo = modoLista;
              const responder = () => {
                if (res.destroyed) return;
                res.statusCode = modo.status || 200; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(modo.data));
              };
              if (modo.hold) pendentesLista.push(responder); else responder();
              return;
            }
            const modo = modosFoto.get(pathname) || {};
            const responder = () => {
              if (res.destroyed) return;
              const status = modo.umaVez401 ? 401 : modo.status || 200; modo.umaVez401 = false;
              res.statusCode = status;
              if (status !== 200) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ mensagem: "Foto privada não encontrada." })); }
              else { res.setHeader("Content-Type", "image/webp"); res.end(modo.corrompida ? Buffer.from("invalid-webp") : pixel); }
            };
            if (modo.hold) pendentesFoto.push(responder); else responder();
          });
        },
      }],
    });
    await servidor.listen();
    const origem = `http://127.0.0.1:${servidor.httpServer.address().port}`;
    assert.match(await (await fetch(origem + "/__perfil")).text(), /__perfil_entry/);
    await (await fetch(origem + "/__perfil_entry.jsx")).text();
    chrome = await abrirChrome(join(temporario, "chrome")); await chrome.navegar(origem + "/__perfil");
    await esperar(() => chrome.avaliar("typeof renderPerfil === 'function'"), "entrada Perfil");
    // Fixture WebP válida criada localmente pelo próprio navegador, sem arquivos reais.
    pixel = Buffer.from(await chrome.avaliar("(() => { const c=document.createElement('canvas'); c.width=c.height=1; return c.toDataURL('image/webp').split(',')[1]; })()"), "base64");
    const texto = () => chrome.avaliar("document.querySelector('.profilePosts')?.textContent || ''");
    const urls = () => chrome.avaliar("window.urlsPerfil");
    const ocultar = async () => {
      await chrome.avaliar("window.ocultarPerfil()");
      await esperar(() => chrome.avaliar("document.querySelector('.profilePage') === null"), "desmontagem Perfil");
    };
    const montar = async (dados = usuario) => {
      await chrome.avaliar(`window.renderPerfil(${JSON.stringify(dados)})`);
      await esperar(() => chrome.avaliar("Boolean(document.querySelector('.profilePage'))"), "montagem Perfil");
    };
    await chrome.viewport(1280, 1800);
    t.afterEach(async () => {
      await ocultar();
      pendentesLista.splice(0).forEach((responder) => responder());
      pendentesFoto.splice(0).forEach((responder) => responder());
    });
    const prontas = async (quantidade) => {
      await esperar(() => chrome.avaliar(`document.querySelectorAll('.profilePostPhoto img').length === ${quantidade}`), "Blobs das miniaturas");
      await chrome.avaliar(`(async () => {
        for (const img of document.querySelectorAll('.profilePostPhoto img')) {
          img.scrollIntoView({block:'center'});
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
      })()`);
      try {
        await esperar(() => chrome.avaliar(`document.querySelectorAll('.profilePostPhoto[aria-busy="false"] img').length === ${quantidade}`), "miniaturas prontas");
      } catch (erro) {
        throw new Error(erro.message + " " + await chrome.avaliar("JSON.stringify([...document.querySelectorAll('.profilePostPhoto')].map(f=>({busy:f.getAttribute('aria-busy'),texto:f.textContent,src:f.querySelector('img')?.src,complete:f.querySelector('img')?.complete,natural:f.querySelector('img')?.naturalWidth})))"));
      }
    };

    await t.test("carrega pending, approved e rejected com fotos do proprietário e motivo", async () => {
      const dados = [post(1, "pending", [foto(id(1), 101)]), post(2, "approved", [foto(id(2), 102)]),
        { ...post(3, "rejected", [foto(id(3), 103), { _id: id(104), url: null }]), motivoRejeicao: "Corrigir localização." }];
      modoLista = { data: dados, hold: true }; modosFoto.set(fotoUrl(id(1), id(101)), { hold: true });
      await montar(); await esperar(() => pendentesLista.length === 1, "listagem pendente");
      assert.match(await texto(), /Carregando suas publicações/);
      pendentesLista.shift()();
      await esperar(() => pendentesFoto.length === 1, "foto privada pendente");
      const conteudo = await texto();
      for (const rotulo of ["Pendente", "Aprovada", "Rejeitada", "Corrigir localização.", "Foto indisponível"]) assert.ok(conteudo.includes(rotulo));
      assert.equal(await chrome.avaliar("document.querySelectorAll('.profilePostCard').length"), 3);
      assert.equal(await chrome.avaliar("document.querySelectorAll('.profilePostCard .ownerPublicationActions a').length"), 3);
      assert.equal(await chrome.avaliar("document.querySelectorAll('.profilePostCard .ownerPublicationActions button').length"), 4);
      assert.equal(await chrome.avaliar("[...document.querySelectorAll('.profilePostCard button')].filter(b => b.textContent === 'Reenviar para aprovação').length"), 1);
      assert.match(conteudo, /Carregando foto/);
      pendentesFoto.shift()(); await prontas(3);
      const requests = requisicoes.filter((r) => r.url.includes("/conteudo"));
      assert.equal(requests.length, 3);
      for (const req of requests) { assert.match(req.url, /^\/trilhas\/minhas\/.+\?variante=miniatura$/); assert.equal(req.method, "GET"); assert.match(req.cookie, /synthetic_session=1/); }
      assert.equal(requisicoes.some((r) => r.url === "/trilhas"), false);
      assert.equal(await chrome.avaliar("[...document.querySelectorAll('.profilePostPhoto img')].every(img => img.src.startsWith('blob:'))"), true);
      const criadas = (await urls()).criadas; assert.equal(criadas.length, 3);
      await ocultar(); const apos = await urls();
      for (const url of criadas) assert.equal(apos.revogadas.filter((v) => v === url).length, 1);
    });
    await t.test("lista vazia não é erro; legado e contextos incorretos não geram pedidos de foto", async () => {
      modoLista = { data: [] }; await montar();
      await esperar(async () => (await texto()).includes("Nenhuma publicação ainda"), "lista vazia"); await ocultar();
      const antes = requisicoes.length;
      modoLista = { data: [post(4, "pending", [{ _id: id(105), url: null }, { _id: id(106), url: `/admin/trilhas/${id(4)}/fotos/${id(106)}/conteudo` },
        { _id: id(107), url: `https://res.cloudinary.com/synthetic/photo.webp` }]), post(5, "approved")] };
      await montar(); await esperar(() => chrome.avaliar("document.querySelectorAll('.profilePostCard').length === 2"), "cards sem fotos utilizáveis");
      assert.match(await texto(), /Nenhuma foto cadastrada/); assert.match(await texto(), /Foto indisponível/);
      assert.equal(requisicoes.slice(antes).length, 1); assert.equal(requisicoes.at(-1).url, "/trilhas/minhas");
      await ocultar();
    });
    await t.test("erro da listagem é mostrado sem fingir lista vazia", async () => {
      modoLista = { status: 500, data: { mensagem: "Não foi possível consultar suas publicações." } };
      await montar(); await esperar(async () => (await texto()).includes("Não foi possível consultar"), "erro de listagem");
      assert.doesNotMatch(await texto(), /Nenhuma publicação ainda/);
      assert.equal(await chrome.avaliar("document.querySelector('.profileIdentityCopy h1').textContent"), usuario.nomeCompleto);
      await ocultar();
    });
    await t.test("erro Blob de uma foto conserva mensagem e não impede outras fotos", async () => {
      modoLista = { data: [post(6, "rejected", [foto(id(6), 108), foto(id(6), 109)])] };
      modosFoto.set(fotoUrl(id(6), id(108)), { status: 404 });
      await montar(); await prontas(1);
      await esperar(async () => (await texto()).includes("Foto privada não encontrada."), "mensagem do Blob");
      await ocultar();
    });
    await t.test("refresh existente recupera foto privada sem endpoint ou autenticação paralelos", async () => {
      const antes = refreshes;
      modoLista = { data: [post(7, "approved", [foto(id(7), 110)])] };
      modosFoto.set(fotoUrl(id(7), id(110)), { umaVez401: true });
      await montar(); await prontas(1); assert.equal(refreshes, antes + 1);
      await ocultar();
    });
    await t.test("falha de decodificação revoga Object URL imediatamente, sem revogar duas vezes", async () => {
      modoLista = { data: [post(8, "pending", [foto(id(8), 111)])] };
      modosFoto.set(fotoUrl(id(8), id(111)), { corrompida: true });
      const antes = (await urls()).criadas.length;
      await montar(); await esperar(async () => (await texto()).includes("Não foi possível exibir a foto."), "erro de decodificação");
      const objeto = (await urls()).criadas[antes]; assert.ok(objeto);
      assert.equal((await urls()).revogadas.filter((u) => u === objeto).length, 1);
      await ocultar(); assert.equal((await urls()).revogadas.filter((u) => u === objeto).length, 1);
    });
    await t.test("desmontagem durante download não cria Object URL tardia nem repovoa a tela", async () => {
      modoLista = { data: [post(9, "pending", [foto(id(9), 112)])] };
      modosFoto.set(fotoUrl(id(9), id(112)), { hold: true });
      await montar(); await esperar(() => pendentesFoto.length === 1, "download privado pendente");
      const antes = (await urls()).criadas.length;
      await ocultar(); pendentesFoto.shift()();
      await chrome.avaliar("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      assert.equal((await urls()).criadas.length, antes);
      assert.equal(await chrome.avaliar("document.querySelector('.profilePage') === null"), true);
    });
    await t.test("troca de conta aborta lista anterior e não mostra publicações da sessão antiga", async () => {
      modoLista = { hold: true, data: [post(10, "pending")] };
      await montar(); await esperar(() => pendentesLista.length === 1, "lista da conta anterior");
      modoLista = { data: [{ ...post(11, "approved"), titulo: "Publicação da outra conta" }] };
      await montar({ ...usuario, _id: id(999), nomeCompleto: "Outra Conta" });
      await esperar(async () => (await texto()).includes("Publicação da outra conta"), "lista da nova conta");
      pendentesLista.shift()();
      await chrome.avaliar("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      assert.doesNotMatch(await texto(), /Publicação pending/);
      await ocultar();
      const resultado = await urls();
      assert.deepEqual([...resultado.criadas].sort(), [...resultado.revogadas].sort());
    });
    await t.test("troca de conta revoga foto carregada e oculta dados anteriores enquanto busca a nova lista", async () => {
      modoLista = { data: [post(12, "approved", [foto(id(12), 113)])] };
      await montar(); await prontas(1);
      const objeto = (await urls()).criadas.at(-1);
      modoLista = { data: [], hold: true };
      await montar({ ...usuario, _id: id(1000), nomeCompleto: "Conta Nova" });
      await esperar(() => pendentesLista.length === 1, "consulta da conta nova");
      assert.match(await texto(), /Carregando suas publicações/);
      assert.equal(await chrome.avaliar("document.querySelectorAll('.profilePostCard, .profilePostPhoto img').length"), 0);
      assert.equal((await urls()).revogadas.filter((u) => u === objeto).length, 1);
      pendentesLista.shift()();
      await esperar(async () => (await texto()).includes("Nenhuma publicação ainda"), "lista da conta nova");
    });
  } finally {
    pendentesLista.splice(0).forEach((responder) => responder()); pendentesFoto.splice(0).forEach((responder) => responder());
    try { await chrome?.fechar(); } finally { try { await servidor?.close(); } finally { await rm(temporario, { recursive: true, force: true }); } }
  }
});
