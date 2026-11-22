import axios from "axios";

let aoNaoAutorizado = () => {};
let aoCsrfInvalido = () => false;
let csrfAtual = null;
let renovacaoEmAndamento = null;
let recuperacaoCsrfEmAndamento = null;
const LOCK_REFRESH_SESSAO = "pe-na-trilha:auth-refresh";
const METODOS_SEGUROS = ["get", "head", "options"];

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL,
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
    try {
      const resposta = await api.post("/usuarios/refresh", null, { semCsrf: true });
      return resposta.data;
    } catch (erro) {
      if (erro.response?.status !== 409) throw erro;

      // Dê tempo para o navegador receber o cookie da outra aba antes de consultá-lo.
      await new Promise((resolver) => setTimeout(resolver, 200));
      const { data: usuario } = await api.get("/usuarios/me", { semRenovacao: true }).catch(() => ({}));
      if (usuario?._id) return { usuario };
      throw erro;
    }
  };

  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(LOCK_REFRESH_SESSAO, solicitarRefresh);
  }

  return solicitarRefresh();
}

export function definirTratadorNaoAutorizado(tratador) {
  aoNaoAutorizado = tratador || (() => {});
}

export function definirTratadorCsrf(tratador) {
  aoCsrfInvalido = tratador || (() => false);
}

export function erroCsrf(erro) {
  return erro?.response?.status === 403 && erro.response.data?.mensagem === "Token CSRF ausente ou inválido.";
}

function usaCsrf(config) {
  return !config.semCsrf && !config.semAutenticacao && !METODOS_SEGUROS.includes(config.method || "get");
}

api.interceptors.request.use((config) => {
  if (usaCsrf(config) && csrfAtual) config.headers.set("X-CSRF-Token", csrfAtual);

  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    const config = erro.config;
    if (config && usaCsrf(config) && !config.signal?.aborted && erroCsrf(erro)) {
      recuperacaoCsrfEmAndamento ||= Promise.resolve().then(aoCsrfInvalido)
        .catch(() => false).finally(() => { recuperacaoCsrfEmAndamento = null; });
      const recuperado = await recuperacaoCsrfEmAndamento;
      erro.mensagemUsuario = recuperado
        ? "A verificação de segurança foi renovada. Confira os dados e envie novamente."
        : "Não foi possível renovar a verificação de segurança. Recarregue a página antes de tentar novamente.";
      // A sessão pode ter mudado em outra aba. A interface pede nova confirmação da ação.
      throw erro;
    }

    const url = config?.url || "";
    const authEndpoint = /\/usuarios\/(login|refresh|logout|csrf)$/.test(url);
    if (erro.response?.status !== 401 || !config || authEndpoint || config._retry
      || config.semAutenticacao || config.semRenovacao || config.signal?.aborted) {
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
    erro.mensagemUsuario || erro.response?.data?.mensagem ||
    "Não foi possível concluir a operação. Verifique se a API está disponível."
  );
}

export default api;
