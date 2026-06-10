import api from "./api";

export async function listarTrilhas(config = {}) {
  const resposta = await api.get("/trilhas", config);
  return resposta.data;
}

export async function buscarTrilha(id) {
  const resposta = await api.get(`/trilhas/${id}`);
  return resposta.data;
}

export async function criarTrilha(dados) {
  const resposta = await api.post("/trilhas", dados);
  return resposta.data;
}

export async function atualizarTrilha(id, dados) {
  const resposta = await api.put(`/trilhas/${id}`, dados);
  return resposta.data;
}

export async function excluirTrilha(id) {
  await api.delete(`/trilhas/${id}`);
}
