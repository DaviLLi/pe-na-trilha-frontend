import assert from "node:assert/strict";
import { test } from "node:test";
import { alterarResposta, ajustarDuracao, duracaoValida, formatarDuracao, prepararPublicacao, validarPublicacao } from "../src/services/publicacaoValidation.js";
import { perguntasTrilha, caracteristicasPorLocal } from "../src/data/detalhesTrilha.js";

const campos = { titulo: " Trilha ", descricao: " Percurso ", endereco: " Local " };

test("permite todas as perguntas sem resposta e duração vazia", () => {
  assert.deepEqual(validarPublicacao(campos), {});
  assert.deepEqual(prepararPublicacao(campos, {}, null), { titulo: "Trilha", descricao: "Percurso", endereco: "Local", duracao: null });
  assert.equal(perguntasTrilha.length + 1, 10);
  assert.ok(perguntasTrilha.every(({ opcoes }) => opcoes.length === 3));
  assert.ok(Object.values(caracteristicasPorLocal).every((opcoes) => opcoes.length === 3));
});

test("limpa uma resposta sem afetar outras e omite campos vazios no payload", () => {
  const anterior = { dificuldade: "Fácil", acesso: "Livre" };
  const atual = alterarResposta(anterior, "dificuldade", "");
  assert.equal(atual.acesso, "Livre");
  assert.equal(atual.dificuldade, "");
  assert.equal(anterior.dificuldade, "Fácil");
  assert.equal("dificuldade" in prepararPublicacao(campos, atual, null), false);
});

test("trocar ou limpar tipo de local limpa a característica principal", () => {
  for (const tipo of ["Praia", ""]) {
    const atual = alterarResposta({ tipoLocal: "Trilha", caracteristicaPrincipal: "Rio" }, "tipoLocal", tipo);
    assert.equal(atual.caracteristicaPrincipal, "");
    assert.equal(atual.tipoLocal, tipo);
  }
});

test("horas e minutos respeitam seus limites independentemente", () => {
  assert.deepEqual(ajustarDuracao(null, "minutos", 1), { horas: 0, minutos: 1 });
  assert.deepEqual(ajustarDuracao({ horas: 23, minutos: 59 }, "horas", 1), { horas: 23, minutos: 59 });
  assert.deepEqual(ajustarDuracao({ horas: 23, minutos: 59 }, "minutos", 1), { horas: 23, minutos: 59 });
  assert.deepEqual(ajustarDuracao({ horas: 0, minutos: 0 }, "horas", -1), { horas: 0, minutos: 0 });
  assert.deepEqual(ajustarDuracao({ horas: 0, minutos: 0 }, "minutos", -1), { horas: 0, minutos: 0 });
});

test("duração é nula ou um par numérico válido e positivo", () => {
  assert.equal(duracaoValida(null), true);
  assert.equal(duracaoValida({ horas: 0, minutos: 1 }), true);
  assert.equal(duracaoValida({ horas: 23, minutos: 59 }), true);
  for (const valor of [{ horas: 0, minutos: 0 }, { horas: 24, minutos: 1 }, { horas: 1, minutos: 60 }, { horas: -1, minutos: 2 }, { horas: 1.5, minutos: 0 }, { horas: "1", minutos: 0 }]) {
    assert.equal(duracaoValida(valor), false);
    assert.ok(validarPublicacao(campos, valor).duracao);
  }
  assert.deepEqual(prepararPublicacao(campos, {}, { horas: 2, minutos: 30 }).duracao, { horas: 2, minutos: 30 });
});

test("mantém duração legada na exibição e rejeita campos essenciais com espaços", () => {
  assert.equal(formatarDuracao(" 1h30 "), "1h30");
  assert.equal(formatarDuracao({ horas: 2, minutos: 30 }), "2h 30min");
  assert.equal(formatarDuracao(null), "");
  assert.equal(formatarDuracao({ horas: 0, minutos: 0 }), "");
  assert.deepEqual(Object.keys(validarPublicacao({ titulo: " ", descricao: " ", endereco: " " })), ["titulo", "descricao", "endereco"]);
  assert.deepEqual(prepararPublicacao(campos, null, null), { titulo: "Trilha", descricao: "Percurso", endereco: "Local" });
});
