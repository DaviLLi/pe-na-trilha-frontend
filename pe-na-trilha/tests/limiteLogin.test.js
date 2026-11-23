import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosHeaders } from "axios";
import { calcularFimBloqueioLogin } from "../src/services/limiteLogin.js";

test("lê Retry-After em segundos, inclusive zero, e em data HTTP", () => {
  const agora = Date.UTC(2026, 10, 22);
  assert.equal(calcularFimBloqueioLogin(new AxiosHeaders({ "Retry-After": "12" }), agora), agora + 12_000);
  assert.equal(calcularFimBloqueioLogin({ "retry-after": "0" }, agora), agora);
  assert.equal(calcularFimBloqueioLogin({ "retry-after": new Date(agora + 9_000).toUTCString() }, agora), agora + 9_000);
  assert.equal(calcularFimBloqueioLogin({ "retry-after": new Date(agora - 9_000).toUTCString() }, agora), agora);
});

test("usa a janela máxima atual quando o header não está disponível ou é inválido", () => {
  for (const valor of [undefined, "-1", "data inválida", "9".repeat(50)]) {
    assert.equal(calcularFimBloqueioLogin({ "retry-after": valor }, 1000), 301_000);
  }
});
