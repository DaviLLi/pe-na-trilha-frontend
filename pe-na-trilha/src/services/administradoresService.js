import api, { erroCsrf, obterMensagemErro } from "./api.js";

export const rotaGerenciamentoAdmin = "/admin/administradores";

export async function listarAdministradores(config) {
  const { data } = await api.get(rotaGerenciamentoAdmin, config);
  const lista = data?.administradores;
  if (!Array.isArray(lista) || lista.some((item) =>
    typeof item?._id !== "string" || !item._id
    || typeof item.nomeCompleto !== "string" || typeof item.email !== "string"
    || typeof item.principal !== "boolean")) {
    throw new Error("Resposta de gerenciamento inválida.");
  }
  return lista;
}

const destinos = { promover: "/promover", remover: "/remover" };

export async function alterarAdministrador(acao, { email, senha }, config) {
  const { status } = await api.post(rotaGerenciamentoAdmin + destinos[acao], { email, senha }, config);
  if (status !== 204) throw new Error("A API não confirmou a alteração.");
}

export function perdeuAcessoGerenciamento(falha) {
  const { status, data } = falha?.response ?? {};
  return status === 401 || (status === 403 && [
    "Acesso exclusivo do administrador principal.",
    "Use a sessão por cookie para acessar esta operação.",
  ].includes(data?.mensagem));
}

export function mensagemGerenciamentoAdmin(falha, alteracao = false) {
  const { status, data } = falha?.response ?? {};
  switch (status) {
    case 401: return "Não foi possível validar sua sessão. Entre novamente para gerenciar administradores.";
    case 403:
      if (data?.mensagem === "Não foi possível confirmar sua identidade.") {
        return "Não foi possível confirmar sua identidade. Confira sua senha antes de tentar novamente.";
      }
      if (erroCsrf(falha)) return obterMensagemErro(falha);
      if (data?.mensagem === "A conta do administrador principal está protegida.") return data.mensagem;
      return "Seu acesso ao gerenciamento de administradores não está disponível.";
    case 404:
      return alteracao ? "A conta informada não foi encontrada." : "O gerenciamento de administradores está indisponível na API.";
    case 409:
      if (data?.mensagem === "Essa conta já é administradora." || data?.mensagem === "Essa conta não é administradora.") {
        return data.mensagem;
      }
      return "A conta já não está no estado esperado. Confira o e-mail e atualize a lista.";
    case 400:
    case 422: return "Verifique o e-mail e a senha atual e tente novamente.";
    case 429: return "Limite de tentativas atingido. Aguarde antes de tentar novamente.";
    default:
      return alteracao
        ? "Não foi possível confirmar a alteração. Atualize a lista antes de tentar novamente."
        : "Não foi possível consultar os administradores. Tente novamente.";
  }
}
