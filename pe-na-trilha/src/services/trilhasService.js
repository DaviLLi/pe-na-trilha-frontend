import api from "./api.js";
import { validarFotosPublicacao } from "./publicacaoValidation.js";

export async function listarTrilhas(config = {}) {
  const resposta = await api.get("/trilhas", config);
  return resposta.data;
}

export async function buscarTrilha(id) {
  const resposta = await api.get(`/trilhas/${id}`);
  return resposta.data;
}

export async function criarTrilha(dados, config = {}) {
  const resposta = await api.post("/trilhas", dados, config);
  return resposta.data;
}

export async function atualizarTrilha(id, dados) {
  const resposta = await api.put(`/trilhas/${id}`, dados);
  return resposta.data;
}

export async function excluirTrilha(id) {
  await api.delete(`/trilhas/${id}`);
}

export async function listarMinhasTrilhas(config = {}) {
  const resposta = await api.get("/trilhas/minhas", config);
  return resposta.data;
}

export async function listarTrilhasPendentes(config = {}) {
  const resposta = await api.get("/trilhas/pendentes", config);
  return resposta.data;
}

export async function moderarTrilha(id, decisao, config = {}) {
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) throw new Error("ID de publicação inválido.");
  if (!decisao || typeof decisao !== "object" || Array.isArray(decisao)
    || Object.keys(decisao).some((campo) => !["status", "motivo"].includes(campo))
    || !["approved", "rejected"].includes(decisao.status)
    || (decisao.status === "approved" && decisao.motivo !== undefined)
    || (decisao.status === "rejected" && (typeof decisao.motivo !== "string" || !decisao.motivo.trim() || decisao.motivo.length > 2000))) {
    throw new Error("Decisão inválida; rejeição exige motivo de até 2000 caracteres.");
  }
  const dados = decisao.status === "approved" ? { status: "approved" } : { status: "rejected", motivo: decisao.motivo.trim() };
  const resposta = await api.post(`/trilhas/${id}/moderacao`, dados, config);
  return resposta.data;
}

export async function adicionarFotoTrilha(id, arquivo, config = {}) {
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) throw new Error("ID de publicação inválido.");
  const erro = validarFotosPublicacao([arquivo]);
  if (erro) throw new Error(erro);
  const dados = new FormData();
  dados.append("imagem", arquivo, arquivo.name || "foto");
  const resposta = await api.post(`/trilhas/${id}/fotos`, dados, config);
  return resposta.data;
}
