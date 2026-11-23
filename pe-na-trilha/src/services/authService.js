import { validarEdicaoPerfil } from "./authValidation.js";
import api, { renovarCookieSessao } from "./api.js";

export async function cadastrarUsuario(dados) {
  const resposta = await api.post("/usuarios", dados, { semAutenticacao: true });
  return resposta.data;
}

export async function loginUsuario(dados) {
  const resposta = await api.post("/usuarios/login", dados, {
    semAutenticacao: true,
  });
  return resposta.data;
}

export async function renovarSessao() {
  return renovarCookieSessao();
}

export async function obterTokenCsrf() {
  const resposta = await api.get("/usuarios/csrf");
  return resposta.data.csrfToken;
}

export async function logoutUsuario() {
  await api.post("/usuarios/logout");
}

export async function buscarUsuarioAutenticado(config) {
  const resposta = await api.get("/usuarios/me", config);
  return resposta.data;
}

export async function atualizarUsuarioAtual(dados, config = {}) {
  const permitidos = ["nomeCompleto", "nomeUsuario", "email"];
  if (!dados || typeof dados !== "object" || Array.isArray(dados) || Object.keys(dados).length !== 3
    || Object.keys(dados).some((campo) => !permitidos.includes(campo))) throw new Error("Campos de perfil inválidos.");
  const erros = validarEdicaoPerfil(dados);
  if (Object.keys(erros).length) throw new Error(Object.values(erros).join(" "));
  const normalizados = Object.fromEntries(permitidos.map((campo) => {
    const valor = dados[campo].trim().normalize("NFC");
    return [campo, campo === "nomeCompleto" ? valor : valor.toLowerCase().normalize("NFC")];
  }));
  return (await api.patch("/usuarios/me", normalizados, config)).data;
}
