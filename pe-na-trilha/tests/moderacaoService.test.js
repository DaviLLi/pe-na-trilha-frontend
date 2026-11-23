import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import axios from "axios";
import api, { definirTokenCsrf } from "../src/services/api.js";
import { listarTrilhasPendentes, moderarTrilha } from "../src/services/trilhasService.js";
const anterior = api.defaults.adapter;
const revisao = "legacy:1234567890";
const id = "000000000000000000000001";
afterEach(() => { api.defaults.adapter = anterior; definirTokenCsrf(null); });
test("fila administrativa usa GET confirmado, cookies e signal", async () => {
  const signal = new AbortController().signal; let req;
  api.defaults.adapter = async (config) => { req = config; return { config, status: 200, data: [], headers: {} }; };
  assert.deepEqual(await listarTrilhasPendentes({ signal }), []);
  assert.equal(req.url, "/trilhas/pendentes"); assert.equal(req.method, "get");
  assert.equal(req.signal, signal); assert.equal(req.withCredentials, true);
});
test("aprovação envia status e revisão e usa CSRF do Axios existente", async () => {
  let req; definirTokenCsrf("csrf-sintetico");
  api.defaults.adapter = async (config) => { req = config; return { config, status: 200, data: { _id: id, status: "approved" }, headers: {} }; };
  assert.equal((await moderarTrilha(id, { status: "approved", revisao })).status, "approved");
  assert.equal(req.url, `/trilhas/${id}/moderacao`); assert.equal(req.method, "post");
  assert.deepEqual(JSON.parse(req.data), { status: "approved", revisao }); assert.equal(req.headers["X-CSRF-Token"], "csrf-sintetico");
  assert.equal(req.withCredentials, true);
});
test("rejeição envia motivo normalizado e preserva AbortSignal", async () => {
  const signal = new AbortController().signal; let req;
  api.defaults.adapter = async (config) => { req = config; return { config, status: 200, data: {}, headers: {} }; };
  await moderarTrilha(id, { status: "rejected", motivo: "  Corrigir endereço.  ", revisao }, { signal });
  assert.deepEqual(JSON.parse(req.data), { status: "rejected", motivo: "Corrigir endereço.", revisao }); assert.equal(req.signal, signal);
});
test("decisões e IDs inválidos são recusados sem request", async () => {
  let chamadas = 0; api.defaults.adapter = async () => { chamadas++; };
  for (const dados of [null, [], {}, { status: "pending" }, { status: "approved", motivo: "não permitido" }, { status: "rejected" },
    { status: "rejected", motivo: "  " }, { status: "rejected", motivo: "a".repeat(2001) }, { status: "approved", titulo: "extra" }]) {
    await assert.rejects(moderarTrilha(id, dados), /Decisão inválida/);
  }
  await assert.rejects(moderarTrilha("../outro", { status: "approved", revisao }), /ID/); assert.equal(chamadas, 0);
});
test("falhas de moderação permanecem disponíveis ao consumidor", async () => {
  const erro = new axios.AxiosError("Conflito", "ERR_BAD_REQUEST"); erro.response = { status: 409, data: { mensagem: "Publicação não está pendente." } };
  api.defaults.adapter = async () => { throw erro; };
  await assert.rejects(moderarTrilha(id, { status: "approved", revisao }), (valor) => valor === erro);
});
test("cancelamento não envia decisão nem inicia consulta da fila", async () => {
  let chamadas = 0; api.defaults.adapter = async () => { chamadas++; };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(listarTrilhasPendentes({ signal: controller.signal }), axios.isCancel);
  await assert.rejects(moderarTrilha(id, { status: "approved", revisao }, { signal: controller.signal }), axios.isCancel);
  assert.equal(chamadas, 0);
});
