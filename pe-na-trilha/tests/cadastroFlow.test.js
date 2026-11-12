import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import api from "../src/services/api.js";
import { concluirCadastro } from "../src/services/cadastroFlow.js";
import { VERSAO_TERMOS, VERSAO_PRIVACIDADE } from "../src/data/documentosLegais.js";

const anterior = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = anterior; });
const campos = { nomeCompleto: " Ana Silva ", nomeUsuario: "Ana", email: "ana@example.com", senha: "Trilha123!", aceiteTermos: true };

test("bloqueia cadastro sem aceite antes da API e do redirecionamento", async () => {
  let chamadas = 0;
  api.defaults.adapter = async () => { chamadas++; };
  await assert.rejects(concluirCadastro({ ...campos, aceiteTermos: false }, () => { chamadas++; }), /Termos de Uso/);
  assert.equal(chamadas, 0);
});

test("envia versões e só redireciona após a confirmação do servidor", async () => {
  let confirmar;
  let requisicao;
  const destinos = [];
  api.defaults.adapter = async (config) => {
    requisicao = config;
    await new Promise((resolve) => { confirmar = resolve; });
    return { config, data: { _id: "u1" }, status: 201, headers: {} };
  };
  const tarefa = concluirCadastro(campos, (...args) => destinos.push(args));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(destinos.length, 0);
  const payload = JSON.parse(requisicao.data);
  assert.equal(payload.aceiteTermos, true);
  assert.equal(payload.versaoTermos, VERSAO_TERMOS);
  assert.equal(payload.versaoPoliticaPrivacidade, VERSAO_PRIVACIDADE);
  assert.equal(payload.nomeCompleto, "Ana Silva");
  assert.equal("dataAceite" in payload, false);
  confirmar();
  await tarefa;
  assert.equal(destinos[0][0], "/login");
  assert.match(destinos[0][1].state.mensagem, /Cadastro concluído/);
});

test("erro de cadastro não redireciona nem apaga os dados fornecidos", async () => {
  const copia = { ...campos };
  let navegou = false;
  api.defaults.adapter = async () => { throw new Error("Falha do servidor"); };
  await assert.rejects(concluirCadastro(campos, () => { navegou = true; }), /Falha do servidor/);
  assert.equal(navegou, false);
  assert.deepEqual(campos, copia);
});
