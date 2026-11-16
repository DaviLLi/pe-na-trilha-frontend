import api from "./api.js";
import { validarFotosPublicacao } from "./publicacaoValidation.js";

export async function enviarFotoPerfil(arquivo, config = {}) {
  const erro = validarFotosPublicacao([arquivo]);
  if (erro) throw new Error(erro);
  const dados = new FormData();
  dados.append("imagem", arquivo, arquivo.name || "foto-perfil");
  const resposta = await api.put("/usuarios/me/foto-perfil", dados, config);
  let url;
  try { url = new URL(resposta.data?.fotoPerfil); } catch { throw new Error("A API não confirmou a foto de perfil."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Resposta de foto de perfil inválida.");
  return { fotoPerfil: url.href };
}
