import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import api, { definirTokenCsrf, definirTratadorNaoAutorizado } from "../src/services/api.js";
import {
  buscarUsuarioAutenticado,
  cadastrarUsuario,
  loginUsuario,
  logoutUsuario,
  obterTokenCsrf,
  renovarSessao,
} from "../src/services/authService.js";

const adaptadorAnterior = api.defaults.adapter;

afterEach(() => {
  api.defaults.adapter = adaptadorAnterior;
  definirTokenCsrf(null);
  definirTratadorNaoAutorizado(null);
});

test("cadastro e login enviam os contratos e usam credenciais de cookie", async () => {
  const requisicoes = [];
  api.defaults.adapter = async (config) => {
    requisicoes.push(config);
    return { config, data: { usuario: { _id: "u1" } }, status: 201, headers: {} };
  };
  await cadastrarUsuario({ nomeCompleto: "Ana" });
  await loginUsuario({ identificador: "ana", senha: "segura" });

  assert.equal(requisicoes[0].url, "/usuarios");
  assert.equal(requisicoes[1].url, "/usuarios/login");
  assert.equal(requisicoes[0].withCredentials, true);
  assert.equal(requisicoes[1].headers.Authorization, undefined);
});

test("restaura sessão e carrega CSRF sem expor JWT", async () => {
  const urls = [];
  api.defaults.adapter = async (config) => {
    urls.push(config.url);
    return {
      config,
      data: config.url.endsWith("/csrf")
        ? { csrfToken: "csrf-de-sessao" }
        : { usuario: { _id: "u1", nomeUsuario: "ana" } },
      status: 200,
      headers: {},
    };
  };

  const sessao = await renovarSessao();
  const csrf = await obterTokenCsrf();
  assert.deepEqual(sessao, { usuario: { _id: "u1", nomeUsuario: "ana" } });
  assert.equal(csrf, "csrf-de-sessao");
  assert.deepEqual(urls, ["/usuarios/refresh", "/usuarios/csrf"]);
});

test("compartilha a mesma renovação entre requisições concorrentes", async () => {
  let chamadas = 0;
  api.defaults.adapter = async (config) => {
    chamadas += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { config, data: { usuario: { _id: "u1" } }, status: 200, headers: {} };
  };
  const resultados = await Promise.all([renovarSessao(), renovarSessao()]);
  assert.equal(chamadas, 1);
  assert.deepEqual(resultados[0], resultados[1]);
});

test("coordena o refresh usando o Web Lock compartilhado entre abas", async () => {
  const descriptorAnterior = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const apiOutraAba = await import("../src/services/api.js?segunda-aba");
  let nomeLock;
  let filaLocks = Promise.resolve();
  let requisicoesAtivas = 0;
  let maximoRequisicoesAtivas = 0;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      locks: {
        request: (nome, callback) => {
          nomeLock = nome;
          const anterior = filaLocks;
          let liberar;
          filaLocks = new Promise((resolve) => { liberar = resolve; });
          return anterior.then(callback).finally(liberar);
        },
      },
    },
  });
  const adapter = async (config) => {
    requisicoesAtivas += 1;
    maximoRequisicoesAtivas = Math.max(maximoRequisicoesAtivas, requisicoesAtivas);
    await new Promise((resolve) => setTimeout(resolve, 5));
    requisicoesAtivas -= 1;
    return { config, data: { usuario: { _id: "u1" } }, status: 200, headers: {} };
  };
  api.defaults.adapter = adapter;
  apiOutraAba.default.defaults.adapter = adapter;

  try {
    await Promise.all([
      renovarSessao(),
      apiOutraAba.renovarCookieSessao(),
    ]);
    assert.equal(nomeLock, "pe-na-trilha:auth-refresh");
    assert.equal(maximoRequisicoesAtivas, 1);
  } finally {
    if (descriptorAnterior) {
      Object.defineProperty(globalThis, "navigator", descriptorAnterior);
    } else {
      delete globalThis.navigator;
    }
  }
});

test("envia CSRF nas mutações e chama logout com cookie", async () => {
  definirTokenCsrf("csrf-valido");
  let requisicao;
  api.defaults.adapter = async (config) => {
    requisicao = config;
    return { config, data: null, status: 204, headers: {} };
  };
  await logoutUsuario();
  assert.equal(requisicao.url, "/usuarios/logout");
  assert.equal(requisicao.headers["X-CSRF-Token"], "csrf-valido");
  assert.equal(requisicao.withCredentials, true);
});

test("401 numa rota protegida tenta renovar e encerra sessão se falhar", async () => {
  let chamadasRefresh = 0;
  let sessaoEncerrada = false;
  definirTratadorNaoAutorizado(() => { sessaoEncerrada = true; });
  api.defaults.adapter = async (config) => {
    if (config.url === "/usuarios/refresh") {
      chamadasRefresh += 1;
      const erro = new Error("Sessão expirada");
      erro.config = config;
      erro.response = { status: 401, data: { mensagem: "Sessão expirada" }, config };
      throw erro;
    }
    const erro = new Error("Não autorizado");
    erro.config = config;
    erro.response = { status: 401, data: { mensagem: "Não autorizado" }, config };
    throw erro;
  };

  await assert.rejects(buscarUsuarioAutenticado(), /Sessão expirada/);
  assert.equal(chamadasRefresh, 1);
  assert.equal(sessaoEncerrada, true);
});

test("falhas temporárias no refresh não encerram o estado de autenticação", async () => {
  for (const causa of [
    { status: 409, mensagem: "Refresh concorrente" },
    { status: 500, mensagem: "Erro do servidor" },
    { status: undefined, mensagem: "Falha de rede" },
  ]) {
    let sessaoEncerrada = false;
    definirTratadorNaoAutorizado(() => { sessaoEncerrada = true; });
    api.defaults.adapter = async (config) => {
      const erro = new Error(causa.mensagem);
      erro.config = config;
      if (config.url === "/usuarios/refresh") {
        if (causa.status) {
          erro.response = { status: causa.status, data: { mensagem: causa.mensagem }, config };
        }
        throw erro;
      }
      erro.response = { status: 401, data: {}, config };
      throw erro;
    };

    await assert.rejects(buscarUsuarioAutenticado(), new RegExp(causa.mensagem));
    assert.equal(sessaoEncerrada, false, causa.mensagem);
  }
});

test("consegue repetir uma consulta depois de renovar a sessão", async () => {
  let chamadasConsulta = 0;
  const urls = [];
  api.defaults.adapter = async (config) => {
    urls.push(config.url);
    if (config.url === "/usuarios/me" && chamadasConsulta++ === 0) {
      const erro = new Error("Access expirado");
      erro.config = config;
      erro.response = { status: 401, data: {}, config };
      throw erro;
    }
    return { config, data: { _id: "u1" }, status: 200, headers: {} };
  };
  const usuario = await buscarUsuarioAutenticado();
  assert.deepEqual(usuario, { _id: "u1" });
  assert.deepEqual(urls, ["/usuarios/me", "/usuarios/refresh", "/usuarios/me"]);
});

test("um 401 após a repetição não inicia outro ciclo de refresh", async () => {
  let chamadasRefresh = 0;
  let chamadasConsulta = 0;
  api.defaults.adapter = async (config) => {
    if (config.url === "/usuarios/refresh") {
      chamadasRefresh += 1;
      return { config, data: {}, status: 200, headers: {} };
    }
    chamadasConsulta += 1;
    const erro = new Error("Não autorizado");
    erro.config = config;
    erro.response = { status: 401, data: {}, config };
    throw erro;
  };

  await assert.rejects(buscarUsuarioAutenticado(), /Não autorizado/);
  assert.equal(chamadasRefresh, 1);
  assert.equal(chamadasConsulta, 2);
});
