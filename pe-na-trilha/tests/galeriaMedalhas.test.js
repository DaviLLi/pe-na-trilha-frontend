import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { niveisMedalhas } from "../src/data/niveisMedalhas.js";
import { abrirChrome, chromeDisponivel } from "./helpers/chrome.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const usuario = { _id: "000000000000000000000010", nomeCompleto: "Pessoa da Trilha", perfil: "user" };
const entrada = `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { BrowserRouter } from 'react-router-dom';
  import App from '/src/App.jsx';
  import { AuthProvider } from '/src/contexts/AuthContext.jsx';
  import api from '/src/services/api.js';
  api.defaults.baseURL = location.origin;
  createRoot(document.querySelector('#root')).render(React.createElement(BrowserRouter, null,
    React.createElement(AuthProvider, null, React.createElement(App))));
`;

async function esperar(verificar, descricao) {
  const limite = Date.now() + 15000;
  while (Date.now() < limite) {
    if (await verificar()) return;
    await new Promise((resolve) => setTimeout(resolve, 35));
  }
  assert.fail(`Tempo excedido ao verificar ${descricao}.`);
}

function publicacoes(aprovadas) {
  return [...Array(aprovadas).fill("approved"), "pending", "rejected"].map((status, indice) => ({
    _id: String(indice + 1), proprietario: usuario._id, status,
  }));
}

test("Guia de Medalhas: galeria acessível e exclusiva de desktop", {
  skip: !chromeDisponivel && "Chrome local ausente; configure PNT_CHROME_BIN.", timeout: 150000,
}, async (t) => {
  const temporario = await mkdtemp(join(tmpdir(), "pnt-medalhas-test-"));
  let chrome, servidor;
  let consultas = 0;
  let trilhas = publicacoes(16);

  try {
    servidor = await createServer({ root, configFile: false, cacheDir: join(temporario, "vite"), logLevel: "error",
      server: { host: "127.0.0.1", port: 0, hmr: false, watch: null }, plugins: [react(), {
        name: "medalhas-synthetic-test-only",
        resolveId(id) { if (id === "/__medalhas.jsx") return "\0medalhas-test.jsx"; },
        load(id) { if (id === "\0medalhas-test.jsx") return entrada; },
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            const pathname = req.url.split("?")[0];
            if (pathname === "/medalhas") {
              res.setHeader("Content-Type", "text/html");
              res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__medalhas.jsx"></script></body></html>');
              return;
            }
            const dados = { "/usuarios/refresh": { usuario }, "/usuarios/csrf": { csrfToken: "sintetico" }, "/trilhas/minhas": trilhas };
            if (!Object.hasOwn(dados, pathname)) return next();
            if (pathname === "/trilhas/minhas") consultas++;
            res.setHeader("Cache-Control", "private, no-store");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(dados[pathname]));
          });
        },
      }],
    });
    await servidor.listen();
    const origem = `http://127.0.0.1:${servidor.httpServer.address().port}`;
    assert.equal((await fetch(origem + "/__medalhas.jsx")).status, 200);
    chrome = await abrirChrome(join(temporario, "chrome"));
    const url = origem + "/medalhas";
    const status = () => chrome.avaliar("document.querySelector('.medalCollectionHeading [role=status]')?.textContent");
    const ativo = () => chrome.avaliar("document.querySelector('.medalCollectionPanel[data-expanded=true]')?.dataset.medal");
    const semRolagemHorizontal = () => chrome.avaliar("document.documentElement.scrollWidth === document.documentElement.clientWidth");
    const detalhes = () => chrome.avaliar(`(() => {
      const painel = document.querySelector('.medalCollectionPanel[data-expanded=true]');
      const botao = painel.querySelector('button');
      const regiao = document.getElementById(botao.getAttribute('aria-controls'));
      return {
        titulo: regiao.querySelector('h3').textContent,
        papel: regiao.querySelector('strong').textContent,
        faixa: regiao.querySelector('p').textContent,
        estado: regiao.querySelector('.medalCollectionStateText').textContent,
        imagem: regiao.querySelector('img').src,
        arteOriginal: document.querySelector('.medalArtwork[alt="' + regiao.querySelector('img').alt + '"]').src,
        acessivel: !regiao.hidden && regiao.getAttribute('aria-labelledby') === botao.id,
        botoesExpandidos: document.querySelectorAll('.medalCollectionTab[aria-expanded=true]').length,
      };
    })()`);

    await t.test("mantém os cinco cards originais no celular e consulta conquistas só no desktop", async () => {
      await chrome.viewport(390, 1200);
      await chrome.navegar(url);
      await esperar(() => chrome.avaliar("document.querySelectorAll('.medalLevel').length === 5"), "cards originais");
      assert.equal(await chrome.avaliar("document.querySelector('.medalCollection') === null"), true);
      assert.equal(await semRolagemHorizontal(), true);
      await chrome.viewport(860, 1200);
      assert.equal(await chrome.avaliar("document.querySelector('.medalCollection') === null"), true);
      assert.equal(consultas, 0);
      await chrome.viewport(861, 1200);
      await esperar(async () => await status() === "3 de 5 conquistadas", "conquistas para 16 trilhas aprovadas");
      assert.equal(await ativo(), "bronze");
      assert.equal(await semRolagemHorizontal(), true);
      assert.equal(consultas, 1);
    });

    await t.test("expande por hover as cinco medalhas com arte, título, faixa e status reais", async () => {
      await chrome.viewport(1280, 1000);
      for (const [indice, nivel] of niveisMedalhas.entries()) {
        await chrome.avaliar("new Promise(resolve => setTimeout(resolve, 380))");
        const [x, y] = await chrome.avaliar(`(() => {
          const {x, y, width, height} = document.querySelector('[data-medal="${nivel.medalha}"] button').getBoundingClientRect();
          return [x + width / 2, y + height / 2];
        })()`);
        await chrome.moverMouse(x, y);
        await esperar(async () => await ativo() === nivel.medalha, `hover de ${nivel.nivel}`);
        const { imagem, arteOriginal, ...conteudo } = await detalhes();
        assert.equal(imagem, arteOriginal);
        assert.deepEqual(conteudo, {
          titulo: nivel.nivel, papel: nivel.titulo, faixa: nivel.faixa,
          estado: indice < 3 ? "Conquistada" : "Bloqueada", acessivel: true, botoesExpandidos: 1,
        });
      }
      assert.equal(await semRolagemHorizontal(), true);
    });

    await t.test("expande por foco, setas, Home e End, e destaca o foco de teclado", async () => {
      await chrome.moverMouse(2, 2);
      await chrome.avaliar("document.querySelector('[data-medal=bronze] button').focus()");
      await esperar(async () => await ativo() === "bronze", "medalha focada");
      const passos = [
        ["ArrowLeft", "verde"], ["ArrowRight", "bronze"], ["End", "ouro"],
        ["ArrowRight", "transparente"], ["ArrowLeft", "ouro"], ["Home", "transparente"],
      ];
      for (const [tecla, medalha] of passos) {
        await chrome.pressionarTecla(tecla);
        await esperar(async () => await ativo() === medalha, tecla);
        assert.equal(await chrome.avaliar("document.activeElement.parentElement.dataset.medal"), medalha);
      }
      assert.equal(await chrome.avaliar("getComputedStyle(document.activeElement).outlineStyle"), "solid");
    });

    await t.test("limpa o brilho ao retirar o mouse e respeita a redução de movimento", async () => {
      const moverNoCartao = async (yRelativo) => {
        const [x, y] = await chrome.avaliar(`(() => {
          const {x,y,width,height} = document.querySelector('.medalCollectionTab[aria-expanded=true]').getBoundingClientRect();
          return [x + width * 0.68, y + height * ${yRelativo}];
        })()`);
        await chrome.moverMouse(x, y);
      };
      const brilho = () => chrome.avaliar("document.querySelector('.medalHolo').style.getPropertyValue('--foil-x')");
      await chrome.avaliar("new Promise(resolve => setTimeout(resolve, 380))");
      await moverNoCartao(0.45);
      await esperar(brilho, "reflexo e inclinação sob o mouse");
      await chrome.moverMouse(2, 2);
      await esperar(async () => !(await brilho()), "limpeza do reflexo");
      await chrome.reduzirMovimento();
      await moverNoCartao(0.55);
      assert.deepEqual(await chrome.avaliar(`new Promise(resolve => requestAnimationFrame(() => {
        const css = getComputedStyle(document.querySelector('.medalHolo'));
        resolve([css.transform, css.animationName, css.transitionProperty]);
      }))`), ["none", "none", "none"]);
      assert.equal(await brilho(), "");
    });

    await t.test("usa os mesmos limites de progresso do Perfil e trata consulta inválida", async () => {
      await chrome.moverMouse(2, 2);
      for (const [dados, texto, medalha, totalBloqueadas] of [
        [publicacoes(0), "1 de 5 conquistadas", "transparente", 4],
        [publicacoes(50), "5 de 5 conquistadas", "ouro", 0],
        [{}, "Progresso indisponível", "transparente", 0],
      ]) {
        await chrome.viewport(860, 1000);
        await esperar(() => chrome.avaliar("document.querySelector('.medalCollection') === null"), "desmontagem no mobile");
        trilhas = dados;
        await chrome.viewport(1280, 1000);
        await esperar(async () => await status() === texto, texto);
        assert.equal(await ativo(), medalha);
        const bloqueadas = await chrome.avaliar("document.querySelectorAll('.medalCollectionPanel[data-locked=true]').length");
        assert.equal(bloqueadas, totalBloqueadas);
      }
      assert.equal((await detalhes()).estado, "Status desconhecido");
    });
  } finally {
    await chrome?.fechar();
    await servidor?.close();
    await rm(temporario, { recursive: true, force: true });
  }
});
