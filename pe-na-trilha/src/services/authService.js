import api from "./api.js";

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

export async function buscarUsuarioAutenticado() {
  const resposta = await api.get("/usuarios/me");
  return resposta.data;
}
