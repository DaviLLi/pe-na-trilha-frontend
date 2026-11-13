import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import api, { definirTokenCsrf } from "../src/services/api.js";
import { criarTrilha, adicionarFotoTrilha } from "../src/services/trilhasService.js";
import { prepararPublicacao, validarFotosPublicacao } from "../src/services/publicacaoValidation.js";
const anterior = api.defaults.adapter;
const id = "000000000000000000000001";
afterEach(() => { api.defaults.adapter = anterior; definirTokenCsrf(null); });
test("criação usa JSON permitido, cookies, CSRF e sinal sem enviar fotos ou estado", async () => {
  let request;
  api.defaults.adapter = async (config) => { request = config; return { config, data: { _id: id, status: "pending" }, status: 201, headers: {} }; };
  definirTokenCsrf("sintetico");
  const dados = prepararPublicacao({ titulo: " Trilha ", descricao: " Descrição ", endereco: " Local " }, { tipoLocal: "Trilha", dificuldade: "Fácil", banheiro: "" }, null);
  const signal = new AbortController().signal;
  assert.deepEqual(await criarTrilha(dados, { signal }), { _id: id, status: "pending" });
  assert.equal(request.url, "/trilhas"); assert.equal(request.method, "post");
  assert.deepEqual(JSON.parse(request.data), { titulo: "Trilha", descricao: "Descrição", endereco: "Local", tipoLocal: "Trilha", dificuldade: "Fácil", duracao: null });
  assert.equal(request.withCredentials, true); assert.equal(request.signal, signal); assert.equal(request.headers["X-CSRF-Token"], "sintetico");
});
test("upload usa FormData com único campo imagem e retorna foto, preservando signal e cookies", async () => {
  let request;
  api.defaults.adapter = async (config) => { request = config; return { config, data: { _id: "foto" }, status: 201, headers: {} }; };
  definirTokenCsrf("sintetico"); const signal = new AbortController().signal;
  const file = new File(["sintetico"], "foto.png", { type: "image/png" });
  assert.deepEqual(await adicionarFotoTrilha(id, file, { signal }), { _id: "foto" });
  assert.equal(request.url, `/trilhas/${id}/fotos`); assert.ok(request.data instanceof FormData);
  assert.deepEqual([...request.data.keys()], ["imagem"]); assert.equal(request.data.get("imagem").name, "foto.png");
  assert.equal(request.signal, signal); assert.equal(request.withCredentials, true); assert.equal(request.headers["X-CSRF-Token"], "sintetico");
});
test("validação permite até cinco arquivos válidos e exatamente 5 MiB, bloqueando vazios, tipos e excesso", () => {
  const png = new File(["foto"], "foto.png", { type: "image/png" });
  assert.equal(validarFotosPublicacao([]), ""); assert.equal(validarFotosPublicacao(Array(5).fill(png)), "");
  assert.equal(validarFotosPublicacao([new Blob([new Uint8Array(5 * 1024 * 1024)], { type: "image/webp" })]), "");
  for (const arquivos of [Array(6).fill(png), [null], [new Blob([], { type: "image/png" })], [new Blob(["foto"], { type: "image/svg+xml" })], [new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/jpeg" })]]) assert.ok(validarFotosPublicacao(arquivos));
});
test("arquivos e IDs inválidos não chegam ao Axios e cancelamento é preservado", async () => {
  let calls = 0; api.defaults.adapter = async () => { calls += 1; throw new Error("não deve executar"); };
  await assert.rejects(adicionarFotoTrilha("externo", new Blob(["x"], { type: "image/png" })), /ID/);
  await assert.rejects(adicionarFotoTrilha(id, new Blob(["x"], { type: "text/plain" })), /JPEG/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(criarTrilha({}, { signal: controller.signal }), (e) => e.code === "ERR_CANCELED");
  await assert.rejects(adicionarFotoTrilha(id, new Blob(["x"], { type: "image/png" }), { signal: controller.signal }), (e) => e.code === "ERR_CANCELED");
  assert.equal(calls, 0);
});
