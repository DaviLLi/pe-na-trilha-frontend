import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import api, { definirTokenCsrf } from "../src/services/api.js";
import { atualizarUsuarioAtual } from "../src/services/authService.js";
import { validarEdicaoPerfil } from "../src/services/authValidation.js";
const anterior = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = anterior; definirTokenCsrf(null); });
test("perfil usa PATCH existente, somente dados básicos normalizados, cookies, CSRF e sinal", async () => {
  let request; api.defaults.adapter = async (config) => { request = config; return { config, data: { _id: "pessoa", nomeCompleto: "Nome" }, status: 200, headers: {} }; };
  definirTokenCsrf("sintetico"); const signal = new AbortController().signal;
  assert.equal((await atualizarUsuarioAtual({ nomeCompleto: " Nome ", nomeUsuario: " A\u0301NA ", email: " ANA@EXAMPLE.INVALID " }, { signal }))._id, "pessoa");
  assert.equal(request.url, "/usuarios/me"); assert.equal(request.method, "patch"); assert.equal(request.signal, signal);
  assert.deepEqual(JSON.parse(request.data), { nomeCompleto: "Nome", nomeUsuario: "ána", email: "ana@example.invalid" });
  assert.equal(request.withCredentials, true); assert.equal(request.headers["X-CSRF-Token"], "sintetico");
});
test("perfil bloqueia campos internos, senha, tipos e dados inválidos antes da API", async () => {
  let calls = 0; api.defaults.adapter = async () => { calls++; throw new Error("não deve executar"); };
  const valido = { nomeCompleto: "Ana", nomeUsuario: "ana", email: "ana@example.invalid" };
  for (const dados of [{ ...valido, perfil: "admin" }, { ...valido, senha: "nova" }, { ...valido, nomeUsuario: "ana123" }, { ...valido, email: "inválido" }, { ...valido, nomeCompleto: null }, {}]) await assert.rejects(atualizarUsuarioAtual(dados));
  assert.equal(calls, 0); assert.equal(Object.keys(validarEdicaoPerfil(valido)).length, 0);
});
test("erro de duplicidade preserva mensagem da API e cancelamento não envia PATCH", async () => {
  const dados = { nomeCompleto: "Ana", nomeUsuario: "ana", email: "ana@example.invalid" };
  const falha = { response: { status: 409, data: { mensagem: "E-mail já cadastrado." } } };
  api.defaults.adapter = async () => { throw falha; }; await assert.rejects(atualizarUsuarioAtual(dados), (e) => e === falha);
  const controller = new AbortController(); controller.abort(); await assert.rejects(atualizarUsuarioAtual(dados, { signal: controller.signal }), (e) => e.code === "ERR_CANCELED");
});
