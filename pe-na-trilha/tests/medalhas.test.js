import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularMedalha } from "../src/data/niveisMedalhas.js";

test("respeita todas as fronteiras das cinco medalhas", () => {
  for (const [quantidade, nivel] of [[0, "Transparente"], [1, "Verde"], [15, "Verde"], [16, "Bronze"], [30, "Bronze"], [31, "Prata"], [49, "Prata"], [50, "Ouro"], [100, "Ouro"]]) {
    assert.equal(calcularMedalha(quantidade).atual.nivel, nivel);
  }
});

test("ausência ou contagem inválida não representa zero aprovações", () => {
  for (const valor of [undefined, null, "0", -1, NaN, 1.5, {}, Infinity]) assert.equal(calcularMedalha(valor), null);
  assert.equal(calcularMedalha(0).atual.titulo, "Iniciante");
});

test("progresso é relativo à faixa atual e Ouro não tem próxima medalha", () => {
  assert.equal(calcularMedalha(0).faltam, 1);
  assert.equal(calcularMedalha(16).progresso, 0);
  assert.equal(calcularMedalha(30).faltam, 1);
  assert.equal(calcularMedalha(49).proxima.nivel, "Ouro");
  assert.equal(calcularMedalha(50).proxima, null);
  assert.equal(calcularMedalha(50).progresso, 100);
});
