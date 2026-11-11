import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import api, {
  definirToken,
  definirTratadorNaoAutorizado,
} from "../src/services/api.js";
import {
  buscarUsuarioAutenticado,
  cadastrarUsuario,
  loginUsuario,
} from "../src/services/authService.js";

const adaptadorAnterior = api.defaults.adapter;

afterEach(() => {
  api.defaults.adapter = adaptadorAnterior;
  definirToken(null);
  definirTratadorNaoAutorizado(null);
});

test("cadastra usuário sem anexar token da sessão", async () => {
  definirToken("token-anterior");
  let requisicao;
  api.defaults.adapter = async (config) => {
    requisicao = config;
    return { config, data: { _id: "usuario-1" }, status: 201, headers: {} };
  };

  const usuario = await cadastrarUsuario({ nomeCompleto: "Ana" });

  assert.equal(usuario._id, "usuario-1");
  assert.equal(requisicao.url, "/usuarios");
  assert.equal(requisicao.headers.Authorization, undefined);
});

test("login retorna token e usuário e não envia token antigo", async () => {
  definirToken("token-antigo");
  let requisicao;
  api.defaults.adapter = async (config) => {
    requisicao = config;
    return {
      config,
      data: { token: "token-novo", usuario: { _id: "usuario-1" } },
      status: 200,
      headers: {},
    };
  };

  const sessao = await loginUsuario({ identificador: "ana", senha: "senha" });

  assert.equal(requisicao.url, "/usuarios/login");
  assert.equal(requisicao.headers.Authorization, undefined);
  assert.equal(sessao.token, "token-novo");
  assert.equal(sessao.usuario._id, "usuario-1");
});

test("consulta usuário com Bearer token e encerra sessão em 401", async () => {
  definirToken("jwt-valido");
  let tokenRequisicao;
  let sessaoEncerrada = false;
  definirTratadorNaoAutorizado(() => {
    sessaoEncerrada = true;
  });
  api.defaults.adapter = async (config) => {
    tokenRequisicao = config.headers.Authorization;
    const erro = new Error("Não autorizado");
    erro.config = config;
    erro.response = { status: 401, data: { mensagem: "Token expirado" }, config };
    throw erro;
  };

  await assert.rejects(buscarUsuarioAutenticado(), /Não autorizado/);

  assert.equal(tokenRequisicao, "Bearer jwt-valido");
  assert.equal(sessaoEncerrada, true);

  api.defaults.adapter = async (config) => {
    tokenRequisicao = config.headers.Authorization;
    return { config, data: {}, status: 200, headers: {} };
  };
  await buscarUsuarioAutenticado();
  assert.equal(tokenRequisicao, undefined);
});

test("consulta e retorna os dados públicos do usuário autenticado", async () => {
  definirToken("jwt-valido");
  const usuarioEsperado = { _id: "usuario-1", nomeCompleto: "Ana" };
  api.defaults.adapter = async (config) => ({
    config,
    data: usuarioEsperado,
    status: 200,
    headers: {},
  });

  const usuario = await buscarUsuarioAutenticado();

  assert.deepEqual(usuario, usuarioEsperado);
});

test("logout limpa o token mantido pelo cliente", async () => {
  definirToken("jwt-valido");
  let tokenRequisicao;
  api.defaults.adapter = async (config) => {
    tokenRequisicao = config.headers.Authorization;
    return { config, data: {}, status: 200, headers: {} };
  };

  definirToken(null);
  await buscarUsuarioAutenticado();

  assert.equal(tokenRequisicao, undefined);
});
