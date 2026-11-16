import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import api, { definirTokenCsrf } from "../src/services/api.js";
import { buscarMinhaTrilha, atualizarTrilha, excluirTrilha, reenviarTrilha, substituirFotoTrilha, removerFotoTrilha } from "../src/services/trilhasService.js";
import { permissoesPublicacaoPropria, prepararEdicaoPublicacao } from "../src/services/publicacaoValidation.js";
import { chavesRespostasTrilha } from "../src/data/detalhesTrilha.js";
const id = "000000000000000000000001", fotoId = "000000000000000000000002";
const anterior = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = anterior; definirTokenCsrf(null); });
test("permissões próprias refletem três estados sem conceder edição a terceiros ou admin", () => {
  for (const status of ["pending", "rejected", "approved"]) {
    const post = { proprietario: id, status }, owner = { _id: id };
    assert.deepEqual(permissoesPublicacaoPropria(post, owner), { editar: true, fotos: status !== "approved", reenviar: status === "rejected", excluir: true });
    for (const usuario of [null, { _id: fotoId, perfil: "admin" }]) assert.deepEqual(permissoesPublicacaoPropria(post, usuario), { editar: false, fotos: false, reenviar: false, excluir: false });
  }
  assert.equal(permissoesPublicacaoPropria({ proprietario: id }, { _id: id }).editar, false);
});
test("edição aprovada ignora campos bloqueados e envia limpezas explícitas das dez características e duração", () => {
  const original = { titulo: "Original", descricao: "Descrição", endereco: "Endereço", ...Object.fromEntries(chavesRespostasTrilha.map((k) => [k, "valor"])), duracao: { horas: 1, minutos: 0 } };
  const dados = prepararEdicaoPublicacao({ titulo: "Tentativa", descricao: "Tentativa", endereco: "Tentativa", fotos: ["tentativa"] }, {}, null, original, true);
  assert.deepEqual(dados, { ...Object.fromEntries(chavesRespostasTrilha.map((k) => [k, null])), duracao: null });
  assert.deepEqual(prepararEdicaoPublicacao(original, original, original.duracao, original, true), {});
});
test("pending/rejected enviam apenas alterações e não expõem campos internos ao salvar", () => {
  const original = { titulo: "Original", descricao: "Descrição", endereco: "Local", tipoLocal: "Trilha", caracteristicaPrincipal: "Rio", duracao: null };
  assert.deepEqual(prepararEdicaoPublicacao({ ...original, titulo: " Novo " }, { ...original, tipoLocal: "Praia", caracteristicaPrincipal: "" }, null, original), { titulo: "Novo", tipoLocal: "Praia", caracteristicaPrincipal: null });
});
test("detalhes próprios, edição, exclusão e reenvio respeitam rotas, JSON, cookies, sinal e CSRF", async () => {
  const requests = []; definirTokenCsrf("sintetico");
  api.defaults.adapter = async (config) => { requests.push(config); return { config, data: { _id: id }, status: 200, headers: {} }; };
  const signal = new AbortController().signal;
  await buscarMinhaTrilha(id, { signal }); await atualizarTrilha(id, { banheiro: null }, { signal }); await excluirTrilha(id, { signal }); await reenviarTrilha(id, { signal });
  assert.deepEqual(requests.map((r) => [r.method, r.url]), [["get", `/trilhas/minhas/${id}`], ["put", `/trilhas/${id}`], ["delete", `/trilhas/${id}`], ["post", `/trilhas/${id}/reenviar`]]);
  assert.deepEqual(JSON.parse(requests[1].data), { banheiro: null }); assert.deepEqual(JSON.parse(requests[3].data), {});
  for (const req of requests) { assert.equal(req.signal, signal); assert.equal(req.withCredentials, true); if (req.method !== "get") assert.equal(req.headers["X-CSRF-Token"], "sintetico"); }
});
test("substituição envia imagem única e remoção usa DELETE com identidade da foto", async () => {
  const requests = []; api.defaults.adapter = async (config) => { requests.push(config); return { config, data: { _id: fotoId }, status: 200, headers: {} }; };
  const signal = new AbortController().signal;
  await substituirFotoTrilha(id, fotoId, new File(["sintetica"], "foto.webp", { type: "image/webp" }), { signal });
  await removerFotoTrilha(id, fotoId, { signal });
  assert.equal(requests[0].method, "put"); assert.deepEqual([...requests[0].data.keys()], ["imagem"]); assert.equal(requests[0].data.get("imagem").name, "foto.webp");
  assert.equal(requests[1].method, "delete"); for (const req of requests) { assert.equal(req.url, `/trilhas/${id}/fotos/${fotoId}`); assert.equal(req.signal, signal); }
});
test("IDs inválidos, fotos inválidas e cancelamento não executam operações", async () => {
  let calls = 0; api.defaults.adapter = async () => { calls++; throw new Error("inesperado"); };
  await assert.rejects(buscarMinhaTrilha("externo")); await assert.rejects(reenviarTrilha("externo")); await assert.rejects(removerFotoTrilha(id, "externo"));
  await assert.rejects(substituirFotoTrilha(id, fotoId, new Blob(["svg"], { type: "image/svg+xml" })));
  const controller = new AbortController(); controller.abort(); await assert.rejects(reenviarTrilha(id, { signal: controller.signal }), (e) => e.code === "ERR_CANCELED"); assert.equal(calls, 0);
});
