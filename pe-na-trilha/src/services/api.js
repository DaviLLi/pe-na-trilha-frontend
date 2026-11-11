import axios from "axios";

let tokenAtual = null;
let aoNaoAutorizado = () => {};

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL || "http://localhost:3000",
});

export function definirToken(token) {
  tokenAtual = token || null;
}

export function definirTratadorNaoAutorizado(tratador) {
  aoNaoAutorizado = tratador || (() => {});
}

api.interceptors.request.use((config) => {
  if (!config.semAutenticacao && tokenAtual) {
    config.headers.Authorization = `Bearer ${tokenAtual}`;
    config.tokenUsado = tokenAtual;
  }

  return config;
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const tokenDaRequisicao = erro.config?.tokenUsado;

    if (
      erro.response?.status === 401 &&
      tokenDaRequisicao &&
      tokenDaRequisicao === tokenAtual
    ) {
      definirToken(null);
      aoNaoAutorizado();
    }

    return Promise.reject(erro);
  },
);

export function obterMensagemErro(erro) {
  return (
    erro.response?.data?.mensagem ||
    "Não foi possível concluir a operação. Verifique se a API está disponível."
  );
}

export default api;
