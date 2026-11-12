import axios from "axios";

let aoNaoAutorizado = () => {};
let csrfAtual = null;
let renovacaoEmAndamento = null;
const LOCK_REFRESH_SESSAO = "pe-na-trilha:auth-refresh";

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

export function definirTokenCsrf(token) {
  csrfAtual = token || null;
}

export function renovarCookieSessao() {
  renovacaoEmAndamento ||= executarRefreshCoordenado()
    .finally(() => {
      renovacaoEmAndamento = null;
    });
  return renovacaoEmAndamento;
}

async function executarRefreshCoordenado() {
  const solicitarRefresh = async () => {
    const resposta = await api.post("/usuarios/refresh", null, { semCsrf: true });
    return resposta.data;
  };

  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(LOCK_REFRESH_SESSAO, solicitarRefresh);
  }

  // Navegadores sem Web Locks continuam protegidos pelo 409 não destrutivo do backend.
  return solicitarRefresh();
}

export function definirTratadorNaoAutorizado(tratador) {
  aoNaoAutorizado = tratador || (() => {});
}

api.interceptors.request.use((config) => {
  const metodo = (config.method || "get").toLowerCase();
  if (!config.semCsrf && !["get", "head", "options"].includes(metodo) && csrfAtual) {
    config.headers["X-CSRF-Token"] = csrfAtual;
  }

  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    const config = erro.config;
    const url = config?.url || "";
    const authEndpoint = /\/usuarios\/(login|refresh|logout|csrf)$/.test(url);
    if (erro.response?.status !== 401 || !config || authEndpoint || config._retry) {
      return Promise.reject(erro);
    }

    config._retry = true;
    try {
      await renovarCookieSessao();
      return api(config);
    } catch (falhaRefresh) {
      if (falhaRefresh.response?.status === 401) {
        definirTokenCsrf(null);
        aoNaoAutorizado();
      }
      return Promise.reject(falhaRefresh);
    }
  },
);

export function obterMensagemErro(erro) {
  return (
    erro.response?.data?.mensagem ||
    "Não foi possível concluir a operação. Verifique se a API está disponível."
  );
}

export default api;
