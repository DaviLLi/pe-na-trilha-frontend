import assert from "node:assert/strict";
import { test } from "node:test";
import { contarPublicacoesProprias } from "../src/services/estatisticasPublicacoes.js";
import { calcularMedalha } from "../src/data/niveisMedalhas.js";
const pessoa = "pessoa";
const publicacao = (id, status) => ({ _id: id, proprietario: pessoa, status });
test("conta todas as publicações próprias, mas somente approved conta para medalha", () => {
  assert.deepEqual(contarPublicacoesProprias([publicacao("a", "pending"), publicacao("b", "rejected"), publicacao("c", "approved"), publicacao("d"), publicacao("e", "desconhecido")], pessoa), { publicadas: 5, aprovadas: 1 });
  assert.deepEqual(contarPublicacoesProprias([], pessoa), { publicadas: 0, aprovadas: 0 });
});
test("resposta incompleta, IDs duplicados ou dados de outra pessoa não fabricam contagens", () => {
  for (const dados of [null, {}, [null], [{ proprietario: pessoa }], [publicacao("a", "approved"), publicacao("a", "approved")], [{ ...publicacao("a", "approved"), proprietario: "outro" }]]) assert.equal(contarPublicacoesProprias(dados, pessoa), null);
  assert.equal(contarPublicacoesProprias([], undefined), null);
});
test("nível e progresso usam as fronteiras originais e ignoram pendentes/rejeitadas", () => {
  for (const [quantidade, nivel] of [[0, "Transparente"], [1, "Verde"], [15, "Verde"], [16, "Bronze"], [30, "Bronze"], [31, "Prata"], [49, "Prata"], [50, "Ouro"]]) {
    const dados = [...Array.from({ length: quantidade }, (_, i) => publicacao(String(i), "approved")), publicacao("pending", "pending"), publicacao("rejected", "rejected")];
    const contagens = contarPublicacoesProprias(dados, pessoa);
    assert.equal(contagens.publicadas, quantidade + 2); assert.equal(calcularMedalha(contagens.aprovadas).atual.nivel, nivel);
  }
});
