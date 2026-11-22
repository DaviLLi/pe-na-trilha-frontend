import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { AxiosError, isCancel } from "axios";
import api, { definirTratadorNaoAutorizado, obterMensagemErro } from "../src/services/api.js";
import { obterUrlImagemPublica, buscarImagemPrivada } from "../src/services/imagensPublicacoesService.js";

const id = "000000000000000000000001";
const fotoId = "000000000000000000000002";
const publico = `/trilhas/${id}/fotos/${fotoId}/conteudo`;
const autor = `/trilhas/minhas/${id}/fotos/${fotoId}/conteudo`;
const admin = `/admin/trilhas/${id}/fotos/${fotoId}/conteudo`;
const adaptadorAnterior = api.defaults.adapter;
const baseAnterior = api.defaults.baseURL;
const imagem = () => new Blob(["synthetic-image"], { type: "image/webp" });
function sucesso(config, data = imagem()) { return { config, data, status: 200, headers: {} }; }
function falhar(config, status, data) {
  throw new AxiosError(`HTTP ${status}`, AxiosError.ERR_BAD_RESPONSE, config, undefined,
    { config, status, data, headers: { "x-synthetic": "preserved" } });
}
beforeEach(() => { api.defaults.baseURL = "https://api.example.invalid"; });
afterEach(() => {
  api.defaults.adapter = adaptadorAnterior; api.defaults.baseURL = baseAnterior;
  definirTratadorNaoAutorizado(null);
});

test("resolve URL pública na origem configurada da API, sem buscar bytes", () => {
  api.defaults.baseURL = "https://api.example.invalid/base/";
  api.defaults.adapter = () => { throw new Error("REQUEST_FORBIDDEN"); };
  assert.equal(obterUrlImagemPublica(publico), `https://api.example.invalid${publico}?variante=detalhe`);
  assert.equal(obterUrlImagemPublica(publico, { variante: "miniatura" }), `https://api.example.invalid${publico}?variante=miniatura`);
  api.defaults.baseURL = "http://localhost:3000";
  assert.equal(obterUrlImagemPublica(publico), `http://localhost:3000${publico}?variante=detalhe`);
});
test("foto legada nula/ausente não produz URL nem requisição privada", async () => {
  let chamadas = 0; api.defaults.adapter = () => { chamadas++; };
  for (const url of [null, undefined]) {
    assert.equal(obterUrlImagemPublica(url), null);
    assert.equal(await buscarImagemPrivada(url), null);
  }
  assert.equal(chamadas, 0);
});
test("rejeita variantes vazias, desconhecidas ou estruturadas antes de qualquer request", async () => {
  let chamadas = 0; api.defaults.adapter = () => { chamadas++; };
  for (const variante of ["", "original", null, ["detalhe"], { width: 999 }]) {
    assert.throws(() => obterUrlImagemPublica(publico, { variante }), /Variante/);
    await assert.rejects(buscarImagemPrivada(autor, { variante }), /Variante/);
  }
  assert.equal(chamadas, 0);
});
test("bloqueia URLs externas, assinadas, arbitrárias e mistura de contextos", async () => {
  let chamadas = 0; api.defaults.adapter = () => { chamadas++; };
  const invalidos = ["https://res.cloudinary.com/demo/image/upload/private.jpg?signature=secret", "https://api.example.invalid" + publico,
    "//external.invalid" + publico, "\\\\external.invalid\\foto", "data:image/webp;base64,AA", "/usuarios/me", "", {},
    publico + "?variante=miniatura", publico + "#secret", publico + "/../conteudo"];
  for (const url of invalidos) {
    assert.throws(() => obterUrlImagemPublica(url), /URL de imagem inválida/);
    await assert.rejects(buscarImagemPrivada(url), /URL de imagem inválida/);
  }
  assert.throws(() => obterUrlImagemPublica(autor), /URL/);
  assert.throws(() => obterUrlImagemPublica(admin), /URL/);
  await assert.rejects(buscarImagemPrivada(publico), /URL/);
  assert.equal(chamadas, 0);
});
test("não resolve origem de API ausente, inválida ou com credenciais embutidas", () => {
  for (const origem of [undefined, "/api", "not-a-url", "ftp://example.invalid", "https://user:secret@example.invalid"]) {
    api.defaults.baseURL = origem;
    assert.throws(() => obterUrlImagemPublica(publico), { message: "Origem da API inválida." });
  }
});
test("autor e admin usam Axios existente com cookies, Blob, variante e AbortSignal", async () => {
  api.defaults.baseURL = "https://api.example.invalid";
  const controller = new AbortController(), requisicoes = [], blob = imagem();
  api.defaults.adapter = async (config) => { requisicoes.push(config); return sucesso(config, blob); };
  assert.equal(await buscarImagemPrivada(autor, { signal: controller.signal }), blob);
  assert.equal(await buscarImagemPrivada(admin, { signal: controller.signal, variante: "miniatura" }), blob);
  assert.equal(requisicoes[0].url, `https://api.example.invalid${autor}?variante=detalhe`);
  assert.equal(requisicoes[1].url, `https://api.example.invalid${admin}?variante=miniatura`);
  for (const config of requisicoes) {
    assert.equal(config.responseType, "blob"); assert.equal(config.withCredentials, true);
    assert.equal(config.signal, controller.signal); assert.equal(config.method, "get");
    assert.equal(config.headers.Accept, "image/webp"); assert.equal(config.headers.Authorization, undefined);
    assert.equal(config.url.includes("cloudinary"), false);
  }
});
test("401 Blob usa refresh existente e repete com o mesmo sinal e responseType", async () => {
  const chamadas = [], controller = new AbortController(); let consultas = 0;
  api.defaults.adapter = async (config) => {
    chamadas.push(config);
    if (config.url === "/usuarios/refresh") return sucesso(config, { usuario: { _id: id } });
    if (consultas++ === 0) falhar(config, 401, new Blob(['{"mensagem":"Access expirado."}'], { type: "application/json" }));
    return sucesso(config);
  };
  assert.equal((await buscarImagemPrivada(autor, { signal: controller.signal })).type, "image/webp");
  assert.equal(chamadas.length, 3); assert.equal(chamadas[1].url, "/usuarios/refresh");
  assert.equal(chamadas[2].signal, controller.signal); assert.equal(chamadas[2].responseType, "blob");
});
test("requisições de imagens compartilham o refresh e preservam cookies", async () => {
  const tentativas = new Map(); let refreshes = 0;
  api.defaults.adapter = async (config) => {
    if (config.url === "/usuarios/refresh") { refreshes++; await new Promise((resolve) => setTimeout(resolve, 5)); return sucesso(config, {}); }
    const quantidade = tentativas.get(config.url) || 0; tentativas.set(config.url, quantidade + 1);
    if (!quantidade) falhar(config, 401, new Blob(['{"mensagem":"Expirado"}']));
    assert.equal(config.withCredentials, true); return sucesso(config);
  };
  const resultados = await Promise.all([buscarImagemPrivada(autor), buscarImagemPrivada(admin)]);
  assert.equal(refreshes, 1); assert.equal(resultados.length, 2);
});
test("segundo 401 não entra em loop e conserva a mensagem do Blob", async () => {
  let refreshes = 0, consultas = 0;
  api.defaults.adapter = async (config) => {
    if (config.url === "/usuarios/refresh") { refreshes++; return sucesso(config, {}); }
    consultas++; falhar(config, 401, new Blob(['{"mensagem":"Sessão negada."}']));
  };
  await assert.rejects(buscarImagemPrivada(autor), (erro) => erro.response.status === 401 && obterMensagemErro(erro) === "Sessão negada.");
  assert.equal(refreshes, 1); assert.equal(consultas, 2);
});
test("refresh revogado 401 encerra sessão e preserva seu erro JSON", async () => {
  let encerrada = false; definirTratadorNaoAutorizado(() => { encerrada = true; });
  api.defaults.adapter = async (config) => {
    if (config.url === "/usuarios/refresh") falhar(config, 401, { mensagem: "Sessão revogada." });
    falhar(config, 401, new Blob(['{"mensagem":"Access expirado"}']));
  };
  await assert.rejects(buscarImagemPrivada(autor), (erro) => obterMensagemErro(erro) === "Sessão revogada.");
  assert.equal(encerrada, true);
});
test("409 de refresh concorrente é preservado sem encerrar sessão", async () => {
  let encerrada = false; definirTratadorNaoAutorizado(() => { encerrada = true; });
  api.defaults.adapter = async (config) => {
    if (config.url === "/usuarios/refresh") falhar(config, 409, { mensagem: "Refresh concorrente." });
    falhar(config, 401, new Blob(['{"mensagem":"Access expirado"}']));
  };
  await assert.rejects(buscarImagemPrivada(autor), (erro) => erro.response.status === 409 && obterMensagemErro(erro) === "Refresh concorrente.");
  assert.equal(encerrada, false);
});
test("erros HTTP Blob preservam mensagem, status, código e headers", async () => {
  for (const status of [400, 403, 404, 500, 502, 503, 504]) {
    api.defaults.adapter = async (config) => falhar(config, status, new Blob([JSON.stringify({ mensagem: `Falha ${status}`, erros: ["detalhe"] })], { type: "application/json" }));
    await assert.rejects(buscarImagemPrivada(autor), (erro) => {
      assert.equal(erro.response.status, status); assert.equal(erro.code, AxiosError.ERR_BAD_RESPONSE);
      assert.equal(erro.response.headers["x-synthetic"], "preserved");
      assert.equal(erro.message, `Falha ${status}`); assert.equal(obterMensagemErro(erro), `Falha ${status}`);
      assert.deepEqual(erro.response.data.erros, ["detalhe"]); return true;
    });
  }
});
test("Blob inválido, HTML, JSON sem mensagem ou erro muito grande não mascaram HTTP", async () => {
  for (const texto of ["<html>invalid</html>", "{broken", "null", "[]", '{"other":true}', '{"mensagem":42}', "x".repeat(65537)]) {
    api.defaults.adapter = async (config) => falhar(config, 502, new Blob([texto]));
    await assert.rejects(buscarImagemPrivada(autor), (erro) => erro.response.status === 502 && erro.response.data instanceof Blob && erro.message === "HTTP 502");
  }
});
test("sucesso exige WebP Blob não vazio dentro do limite, nunca JSON/HTML", async () => {
  for (const data of [{ mensagem: "unexpected" }, new Blob(["html"], { type: "text/html" }), new Blob([], { type: "image/webp" }),
    new Blob([new Uint8Array(8 * 1024 * 1024 + 1)], { type: "image/webp" })]) {
    api.defaults.adapter = async (config) => sucesso(config, data);
    await assert.rejects(buscarImagemPrivada(autor), (erro) => erro.code === AxiosError.ERR_BAD_RESPONSE);
  }
});
test("sinal já cancelado não inicia request e é reconhecido por Axios", async () => {
  let chamadas = 0; api.defaults.adapter = async (config) => { chamadas++; return sucesso(config); };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(buscarImagemPrivada(autor, { signal: controller.signal }), isCancel);
  assert.equal(chamadas, 0);
});
test("cancelamento em andamento interrompe a espera, sem refresh", async () => {
  const controller = new AbortController(); let iniciou;
  const inicio = new Promise((resolve) => { iniciou = resolve; });
  api.defaults.adapter = (config) => new Promise((resolve) => {
    config.signal.addEventListener("abort", () => resolve(sucesso(config)), { once: true }); iniciou();
  });
  const pendente = buscarImagemPrivada(autor, { signal: controller.signal });
  await inicio; controller.abort(); await assert.rejects(pendente, isCancel);
});
test("cancelar uma foto durante refresh não cancela a renovação compartilhada", async () => {
  const controller = new AbortController(); let iniciou, liberar; let buscas = 0;
  const inicio = new Promise((resolve) => { iniciou = resolve; });
  const liberacao = new Promise((resolve) => { liberar = resolve; });
  api.defaults.adapter = async (config) => {
    if (config.url === "/usuarios/refresh") { iniciou(); await liberacao; return sucesso(config, {}); }
    buscas++; falhar(config, 401, new Blob(['{"mensagem":"expirado"}']));
  };
  const pendente = buscarImagemPrivada(autor, { signal: controller.signal });
  await inicio;
  try {
    controller.abort();
    await assert.rejects(pendente, isCancel);
    assert.equal(buscas, 1);
  } finally { liberar(); }
  // A continuação Axios consumirá o sinal cancelado, sem novo request de imagem.
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(buscas, 1);
});
test("falha de rede conserva o erro original e não toca armazenamento persistente", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("PERSISTENCE_FORBIDDEN"); } });
  const erro = new AxiosError("Network Error", AxiosError.ERR_NETWORK);
  api.defaults.adapter = async () => { throw erro; };
  try { await assert.rejects(buscarImagemPrivada(autor), (recebido) => recebido === erro); }
  finally { if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor); else delete globalThis.localStorage; }
});
