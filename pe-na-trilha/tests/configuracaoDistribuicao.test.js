import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { validarApi } from "../vite.config.js";

const producao = "https://api-production.example.invalid";
const homologacao = "https://api-homologation.example.invalid";
const origens = { PNT_API_ORIGIN_PRODUCTION: producao, PNT_API_ORIGIN_HOMOLOGATION: homologacao };

test("desenvolvimento exige VITE_API_URL e aceita API local explícita", () => {
  assert.throws(() => validarApi({}, "serve", "development"), /VITE_API_URL/);
  assert.equal(validarApi({ VITE_API_URL: "http://localhost:3000/" }, "serve", "development"), "http://localhost:3000");
});

test("distribuição exige API e origens independentes, selecionadas pelo modo", () => {
  for (const [modo, origem, outra] of [["production", producao, homologacao], ["homologation", homologacao, producao]]) {
    assert.equal(validarApi({ ...origens, VITE_API_URL: origem }, "build", modo), origem);
    assert.throws(() => validarApi(origens, "build", modo), /VITE_API_URL/);
    assert.throws(() => validarApi({ VITE_API_URL: origem }, "build", modo), /PNT_API_ORIGIN_PRODUCTION/);
    assert.throws(() => validarApi({ ...origens, VITE_API_URL: outra }, "build", modo), /deve corresponder/);
    assert.throws(() => validarApi({ ...origens, PNT_API_ORIGIN_HOMOLOGATION: producao, VITE_API_URL: origem }, "build", modo), /domínios de API distintos/);
  }
  for (const modo of ["development", "staging"]) assert.throws(() => validarApi({}, "build", modo), /Modo inválido/);
});

test("homologação aceita HTTP somente em localhost e 127.0.0.1 com origem correspondente", () => {
  for (const command of ["serve", "build"]) {
    for (const host of ["localhost", "127.0.0.1"]) {
      const origem = `http://${host}:3000`;
      const env = { ...origens, PNT_API_ORIGIN_HOMOLOGATION: origem, VITE_API_URL: origem };
      assert.equal(validarApi(env, command, "homologation"), origem);
      assert.throws(() => validarApi({ ...env, VITE_API_URL: `http://${host}:3001` }, command, "homologation"), /deve corresponder/);
      assert.throws(() => validarApi({ ...env, VITE_API_URL: producao }, command, "homologation"), /deve corresponder/);
    }
  }
  for (const origem of ["http://api.example.invalid", "http://localhost.example.invalid", "http://127.0.0.2", "http://127.1", "http://[::1]", "http://192.168.1.2", "https://localhost", "http://localhost/api"]) {
    assert.throws(() => validarApi({ ...origens, VITE_API_URL: origem }, "build", "homologation"), /VITE_API_URL/);
    assert.throws(() => validarApi({ ...origens, PNT_API_ORIGIN_HOMOLOGATION: origem, VITE_API_URL: homologacao }, "build", "homologation"), /PNT_API_ORIGIN_HOMOLOGATION/);
  }
});

test("produção rejeita HTTP, endereços locais, credenciais e URLs com caminho", () => {
  for (const VITE_API_URL of [
    "http://api-production.example.invalid", "http://localhost:3000", "http://127.0.0.1:3000", "https://localhost:3000", "https://localhost.localdomain",
    "https://api.local", "https://127.0.0.1", "https://192.168.1.2", "https://[::1]",
    `${producao}/api`, `${producao}?query`, `${producao}#fragmento`, "https://usuario:senha@api.example.invalid",
  ]) {
    assert.throws(() => validarApi({ ...origens, VITE_API_URL }, "build", "production"), /VITE_API_URL/);
  }
  assert.throws(() => validarApi({ ...origens, PNT_API_ORIGIN_HOMOLOGATION: "https://localhost", VITE_API_URL: producao }, "build", "production"), /PNT_API_ORIGIN_HOMOLOGATION/);
  assert.throws(() => validarApi({ ...origens, PNT_API_ORIGIN_HOMOLOGATION: "http://localhost:3000", VITE_API_URL: producao }, "build", "production"), /PNT_API_ORIGIN_HOMOLOGATION/);
});

test("arquivos de ambiente de distribuição e cache do Vite têm regras no Git", () => {
  const regrasRepo = readFileSync(new URL("../../.gitignore", import.meta.url), "utf8").split(/\r?\n/);
  const regrasApp = readFileSync(new URL("../.gitignore", import.meta.url), "utf8").split(/\r?\n/);
  assert.ok(regrasRepo.includes(".env.production"));
  assert.ok(regrasRepo.includes(".env.homologation"));
  assert.ok(regrasApp.includes(".vite/"));
});
