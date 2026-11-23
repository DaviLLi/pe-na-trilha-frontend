import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { validarApi } from "../vite.config.js";

const producao = "https://api-production.example.invalid";

test("os comandos locais usam APIs distintas mesmo com VITE_API_URL herdada", () => {
  const herdado = { VITE_API_URL: producao };
  assert.equal(validarApi(herdado, "serve", "production"), "http://localhost:3000");
  assert.equal(validarApi(herdado, "serve", "homologation"), "http://127.0.0.1:3001");
  assert.throws(() => validarApi({}, "serve", "development"), /production ou homologation/);
});

test("build de homologação usa a API local de homologação sem configuração de produção", () => {
  assert.equal(validarApi({}, "build", "homologation"), "http://127.0.0.1:3001");
  assert.equal(validarApi({ VITE_API_URL: producao }, "build", "homologation"), "http://127.0.0.1:3001");
});

test("build de produção exige a origem HTTPS da API de produção", () => {
  assert.equal(validarApi({ VITE_API_URL: producao + "/" }, "build", "production"), producao);
  assert.throws(() => validarApi({}, "build", "production"), /VITE_API_URL/);
  for (const VITE_API_URL of [
    "http://api-production.example.invalid", "http://localhost:3000", "https://localhost:3000",
    "https://api.local", "https://127.0.0.1", "https://[::1]", producao + "/api",
    producao + "?a=1", producao + "#a", "https://usuario:senha@api.example.invalid",
  ]) assert.throws(() => validarApi({ VITE_API_URL }, "build", "production"), /VITE_API_URL/);
});

test("arquivos de ambiente e cache são ignorados e a Vercel tem fallback SPA", () => {
  const regras = readFileSync(new URL("../../.gitignore", import.meta.url), "utf8");
  assert.match(regras, /^\.env\.production$/m);
  assert.match(regras, /^\.env\.homologation$/m);
  assert.match(readFileSync(new URL("../.gitignore", import.meta.url), "utf8"), /^\.vite\/$/m);
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(vercel.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);
});
