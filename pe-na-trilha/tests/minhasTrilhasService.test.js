import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import axios from "axios";
import api from "../src/services/api.js";
import { listarMinhasTrilhas } from "../src/services/trilhasService.js";
const anterior = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = anterior; });
test("consulta minhas publicações com cookie e AbortSignal, preservando todos os estados", async () => {
  const controller = new AbortController(); let request;
  const dados = ["pending", "approved", "rejected"].map((status) => ({ _id: status, status }));
  api.defaults.adapter = async (config) => { request = config; return { config, status: 200, data: dados, headers: {} }; };
  assert.deepEqual(await listarMinhasTrilhas({ signal: controller.signal }), dados);
  assert.equal(request.url, "/trilhas/minhas"); assert.equal(request.method, "get");
  assert.equal(request.withCredentials, true); assert.equal(request.signal, controller.signal);
});
test("listagem própria vazia preserva array vazio", async () => {
  api.defaults.adapter = async (config) => ({ config, status: 200, data: [], headers: {} });
  assert.deepEqual(await listarMinhasTrilhas(), []);
});
test("erro HTTP da listagem não é convertido em lista vazia", async () => {
  const erro = new axios.AxiosError("Falha", "ERR_BAD_RESPONSE"); erro.response = { status: 500, data: { mensagem: "Falha temporária." } };
  api.defaults.adapter = async () => { throw erro; };
  await assert.rejects(listarMinhasTrilhas(), (recebido) => recebido === erro);
});
test("sinal já cancelado impede a consulta própria", async () => {
  let chamadas = 0; api.defaults.adapter = async () => { chamadas++; };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(listarMinhasTrilhas({ signal: controller.signal }), axios.isCancel);
  assert.equal(chamadas, 0);
});
