import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import api, { definirTokenCsrf } from "../src/services/api.js";
import { enviarFotoPerfil } from "../src/services/fotoPerfilService.js";
import { destinoAposLogin } from "../src/services/navegacaoSegura.js";
const anterior = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = anterior;definirTokenCsrf(null); });
test("retorno do login aceita apenas rotas internas conhecidas e respeita admin", () => {
  const usuario = { perfil: "user" };
  assert.deepEqual(destinoAposLogin({ pathname: "/perfil", search: "?aba=fotos", hash: "#publicacoes" }, usuario), { pathname: "/perfil", search: "?aba=fotos", hash: "#publicacoes" });
  assert.equal(destinoAposLogin({ pathname: "/admin" }, usuario), "/trilhas");
  assert.deepEqual(destinoAposLogin({ pathname: "/admin" }, { perfil: "admin" }), { pathname: "/admin", search: "", hash: "" });
  for (const origem of [null, "https://example.invalid", { pathname: "//example.invalid" }, { pathname: "https://example.invalid" }, { pathname: "/login" }, { pathname: "/%2fexample.invalid" }, { pathname: "/perfil", search: "?a=\n" }]) assert.equal(destinoAposLogin(origem, usuario), "/trilhas");
});
test("avatar usa PUT real, imagem única, cookies, CSRF, sinal e não altera fotos de publicações", async () => {
  let request;api.defaults.adapter = async (config) => { request = config;return { config, data: { fotoPerfil: "https://example.invalid/avatar.webp" }, status: 200, headers: {} }; };
  definirTokenCsrf("sintetico");const signal = new AbortController().signal;
  assert.deepEqual(await enviarFotoPerfil(new File(["sintetica"], "avatar.png", { type: "image/png" }), { signal }), { fotoPerfil: "https://example.invalid/avatar.webp" });
  assert.equal(request.url, "/usuarios/me/foto-perfil");assert.equal(request.method, "put");assert.equal(request.withCredentials, true);assert.equal(request.signal, signal);assert.equal(request.headers["X-CSRF-Token"], "sintetico");assert.deepEqual([...request.data.keys()], ["imagem"]);
});
test("avatar inválido e cancelamento são bloqueados; resposta sem confirmação não vira sucesso", async () => {
  let calls = 0;api.defaults.adapter = async (config) => { calls++;return { config, data: {}, status: 200, headers: {} }; };
  for (const file of [new Blob(["svg"], { type: "image/svg+xml" }), new Blob([new Uint8Array(5242881)], { type: "image/png" }), new Blob([], { type: "image/png" })]) await assert.rejects(enviarFotoPerfil(file));
  const controller = new AbortController();controller.abort();await assert.rejects(enviarFotoPerfil(new Blob(["foto"], { type: "image/png" }), { signal: controller.signal }), (e) => e.code === "ERR_CANCELED");assert.equal(calls, 0);
  await assert.rejects(enviarFotoPerfil(new Blob(["foto"], { type: "image/png" })), /não confirmou/);
});
