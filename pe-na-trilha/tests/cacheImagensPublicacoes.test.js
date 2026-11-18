import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { setTimeout as esperar } from "node:timers/promises";
import { isCancel } from "axios";
import api from "../src/services/api.js";
import { criarCacheImagensPublicacoes, ErroDecodificacaoImagem } from "../src/services/cacheImagensPublicacoes.js";

const foto = "/trilhas/minhas/000000000000000000000001/fotos/000000000000000000000002/conteudo";
const outraFoto = foto.replace("000000000000000000000002", "000000000000000000000003");
const fotoAdmin = foto.replace("/trilhas/minhas/", "/admin/trilhas/");
const blob = new Blob(["foto"], { type: "image/webp" });
const adapter = api.defaults.adapter;
const caches = new Set();

afterEach(() => {
  for (const cache of caches) cache.encerrar();
  caches.clear();
  api.defaults.adapter = adapter;
});

function ambiente(t, opcoes = { validar: async () => {} }) {
  const cache = criarCacheImagensPublicacoes(opcoes);
  caches.add(cache);
  const chamadas = [], criadas = [], revogadas = [];
  const criar = URL.createObjectURL.bind(URL);
  const revogar = URL.revokeObjectURL.bind(URL);
  t.mock.method(URL, "createObjectURL", (dados) => {
    const url = criar(dados);
    criadas.push(url);
    return url;
  });
  t.mock.method(URL, "revokeObjectURL", (url) => {
    revogadas.push(url);
    revogar(url);
  });
  function responderCom(responder) {
    api.defaults.adapter = async (config) => {
      chamadas.push(config);
      return { config, status: 200, headers: {}, data: await responder(config) };
    };
  }
  responderCom(() => blob);
  return { cache, chamadas, criadas, revogadas, responderCom };
}

test("a primeira imagem usa HTTP e uma remontagem reutiliza sua Object URL", async (t) => {
  const { cache, chamadas, criadas, revogadas } = ambiente(t);
  const primeiro = cache.adquirir(foto);
  const url = await primeiro.resultado;
  assert.equal(chamadas.length, 1);
  primeiro.liberar();
  const segundo = cache.adquirir(foto);
  assert.equal(await segundo.resultado, url);
  assert.equal(chamadas.length, 1);
  assert.deepEqual(criadas, [url]);
  assert.deepEqual(revogadas, []);
  segundo.liberar();
  cache.encerrar();
  assert.deepEqual(revogadas, [url]);
});

test("pedidos simultâneos compartilham o download e cancelar um preserva o outro", async (t) => {
  const { cache, chamadas, responderCom } = ambiente(t);
  const resposta = Promise.withResolvers();
  responderCom(() => resposta.promise);
  const primeiro = cache.adquirir(foto);
  const segundo = cache.adquirir(foto);
  assert.equal(primeiro.resultado, segundo.resultado);
  await esperar(0);
  assert.equal(chamadas.length, 1);
  primeiro.liberar();
  primeiro.liberar();
  assert.equal(chamadas[0].signal.aborted, false);
  resposta.resolve(blob);
  assert.match(await segundo.resultado, /^blob:/);
  segundo.liberar();
});

test("quando sai o último consumidor, cancela a rede e ignora resposta tardia", async (t) => {
  const { cache, chamadas, criadas, responderCom } = ambiente(t);
  const resposta = Promise.withResolvers();
  responderCom(() => resposta.promise);
  const a = cache.adquirir(foto);
  const b = cache.adquirir(foto);
  await esperar(0);
  const cancelado = assert.rejects(a.resultado, isCancel);
  a.liberar();
  b.liberar();
  assert.equal(chamadas[0].signal.aborted, true);
  await cancelado;
  resposta.resolve(blob);
  await esperar(0);
  assert.equal(criadas.length, 0);
  const nova = cache.adquirir(foto);
  await nova.resultado;
  assert.equal(chamadas.length, 2);
  nova.liberar();
});

test("versões, variantes e rotas de autor e Admin mantêm chaves distintas", async (t) => {
  const { cache, chamadas } = ambiente(t);
  const recursos = [
    cache.adquirir(foto, { versao: "v1" }),
    cache.adquirir(foto, { versao: "v2" }),
    cache.adquirir(foto, { versao: "v2", variante: "miniatura" }),
    cache.adquirir(fotoAdmin, { versao: "v2" }),
  ];
  assert.equal(new Set(await Promise.all(recursos.map((r) => r.resultado))).size, 4);
  assert.equal(chamadas.length, 4);
  for (const recurso of recursos) recurso.liberar();
});

test("LRU limita bytes e não revoga imagens em uso, inclusive sob pressão", async (t) => {
  const { cache, revogadas } = ambiente(t, { limiteBytes: blob.size * 2, validar: async () => {} });
  const primeira = cache.adquirir(foto);
  const emUso = await primeira.resultado;
  const segunda = cache.adquirir(outraFoto);
  const ociosa = await segunda.resultado;
  segunda.liberar();
  const terceira = cache.adquirir(fotoAdmin);
  await terceira.resultado;
  assert.deepEqual(revogadas, [ociosa]);
  assert.equal(await primeira.resultado, emUso);
  primeira.liberar();
  terceira.liberar();
});

test("o limite de entradas descarta a menos recente e o prazo remove as ociosas", async (t) => {
  const { cache, revogadas } = ambiente(t, { limiteImagens: 2, validadeMs: 100, validar: async () => {} });
  async function usar(url) {
    const recurso = cache.adquirir(url);
    const imagem = await recurso.resultado;
    recurso.liberar();
    return imagem;
  }
  const a = await usar(foto);
  const b = await usar(outraFoto);
  assert.equal(await usar(foto), a);
  const c = await usar(fotoAdmin);
  assert.deepEqual(revogadas, [b]);
  await esperar(130);
  assert.deepEqual(revogadas, [b, a, c]);
});

test("encerrar a sessão aborta pendentes e revoga recursos ao sair o último consumidor", async (t) => {
  const { cache, chamadas, revogadas, responderCom } = ambiente(t);
  const ativo = cache.adquirir(foto);
  const url = await ativo.resultado;
  const ocioso = cache.adquirir(fotoAdmin);
  const urlOciosa = await ocioso.resultado;
  ocioso.liberar();
  responderCom(() => new Promise(() => {}));
  const pendente = cache.adquirir(outraFoto);
  const cancelado = assert.rejects(pendente.resultado, isCancel);
  await esperar(0);
  cache.encerrar();
  await cancelado;
  assert.equal(chamadas.at(-1).signal.aborted, true);
  assert.deepEqual(revogadas, [urlOciosa]);
  ativo.liberar();
  pendente.liberar();
  assert.deepEqual(revogadas, [urlOciosa, url]);
  assert.throws(() => cache.adquirir(foto), isCancel);
});

test("falhas de rede são descartadas e permitem tentar de novo", async (t) => {
  const { cache, chamadas, responderCom } = ambiente(t);
  responderCom(() => Promise.reject(new Error("Rede indisponível.")));
  const primeira = cache.adquirir(foto);
  await assert.rejects(primeira.resultado, /Rede indisponível/);
  primeira.liberar();
  responderCom(() => blob);
  const segunda = cache.adquirir(foto);
  assert.match(await segunda.resultado, /^blob:/);
  assert.equal(chamadas.length, 2);
  segunda.liberar();
});

test("imagem incompleta não entra no cache e sua Object URL é revogada", async (t) => {
  const { cache, chamadas, criadas, revogadas } = ambiente(t, {});
  for (let i = 0; i < 2; i++) {
    const recurso = cache.adquirir(foto);
    await assert.rejects(recurso.resultado, ErroDecodificacaoImagem);
    recurso.liberar();
  }
  assert.equal(chamadas.length, 2);
  assert.equal(criadas.length, 2);
  assert.deepEqual(revogadas, criadas);
});
