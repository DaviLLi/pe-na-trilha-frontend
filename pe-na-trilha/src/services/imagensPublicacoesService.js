import axios, { AxiosError, CanceledError, isCancel } from "axios";
import api from "./api.js";

const ID = "[a-f0-9]{24}";
const CAMINHOS = {
  publico: new RegExp(`^/trilhas/${ID}/fotos/${ID}/conteudo$`, "i"),
  privado: new RegExp(`^/(?:trilhas/minhas|admin/trilhas)/${ID}/fotos/${ID}/conteudo$`, "i"),
};
const VARIANTES = new Set(["miniatura", "detalhe"]);
const MAX_IMAGEM_BYTES = 8 * 1024 * 1024;
const MAX_ERRO_JSON_BYTES = 64 * 1024;

function cancelarSeNecessario(signal) {
  if (signal?.aborted) throw new CanceledError("Requisição de imagem cancelada.");
}

function resolverUrl(url, contexto, variante) {
  if (!VARIANTES.has(variante)) throw new Error("Variante de imagem inválida.");
  if (url === null || url === undefined) return null;
  // Só aceita o caminho de bytes devolvido pelo backend. Não aceita endereços
  // externos, URLs assinadas, query strings nem troca implícita de contexto.
  if (typeof url !== "string" || !CAMINHOS[contexto].test(url)) {
    throw new Error("URL de imagem inválida.");
  }
  let base;
  try { base = new URL(api.defaults.baseURL); } catch {
    throw new Error("Origem da API inválida.");
  }
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) {
    throw new Error("Origem da API inválida.");
  }
  const destino = new URL(url, base.origin);
  destino.searchParams.set("variante", variante);
  return destino.href;
}

/** URL para img público; null indica foto legada/indisponível. Não faz request. */
export function obterUrlImagemPublica(url, { variante = "detalhe" } = {}) {
  return resolverUrl(url, "publico", variante);
}

// Axios pode aguardar um refresh compartilhado. O consumidor da imagem pode sair
// dessa espera imediatamente; a renovação das outras requisições não é cancelada.
function aguardarComCancelamento(operacao, signal) {
  cancelarSeNecessario(signal);
  if (!signal) return operacao();
  return new Promise((resolve, reject) => {
    const limpar = () => signal.removeEventListener("abort", abortar);
    const concluir = (callback, valor) => { limpar(); callback(valor); };
    const abortar = () => concluir(reject, new CanceledError("Requisição de imagem cancelada."));
    signal.addEventListener("abort", abortar, { once: true });
    try {
      Promise.resolve(operacao()).then(
        (valor) => concluir(resolve, valor),
        (erro) => concluir(reject, erro),
      );
    } catch (erro) { concluir(reject, erro); }
  });
}

async function preservarMensagemBlob(erro, signal) {
  const dados = erro.response?.data;
  if (!(dados instanceof Blob) || dados.size > MAX_ERRO_JSON_BYTES) return;
  let json;
  try { json = JSON.parse(await dados.text()); } catch { return; }
  cancelarSeNecessario(signal);
  if (!json || Array.isArray(json) || typeof json.mensagem !== "string" || !json.mensagem.trim()) return;
  // Conserva identidade do erro Axios, status, headers, config e código. O helper
  // obterMensagemErro existente passa a ler a mensagem JSON normalmente.
  erro.response.data = json;
  erro.message = json.mensagem;
}

export function prepararImagemPublicacao(url, contexto, variante) {
  const endereco = resolverUrl(url, contexto, variante);
  if (endereco === null) return null;
  return { endereco, buscar: (signal) => baixarImagem(endereco, contexto, signal) };
}

async function baixarImagem(endereco, contexto, signal) {
  cancelarSeNecessario(signal);
  const privada = contexto === "privado";
  const cliente = privada ? api : axios;
  try {
    const resposta = await aguardarComCancelamento(() => cliente.get(endereco, {
      responseType: "blob", withCredentials: privada, signal,
      headers: { Accept: "image/webp" },
    }), signal);
    cancelarSeNecessario(signal);
    const blob = resposta.data;
    if (!(blob instanceof Blob) || blob.type.split(";")[0].toLowerCase() !== "image/webp"
      || blob.size === 0 || blob.size > MAX_IMAGEM_BYTES) {
      throw new AxiosError("Resposta de imagem inválida.", AxiosError.ERR_BAD_RESPONSE,
        resposta.config, resposta.request, resposta);
    }
    return blob;
  } catch (erro) {
    cancelarSeNecessario(signal);
    if (isCancel(erro)) throw erro;
    await preservarMensagemBlob(erro, signal);
    cancelarSeNecessario(signal);
    throw erro;
  }
}

export async function buscarImagemPrivada(url, { variante = "detalhe", signal } = {}) {
  cancelarSeNecessario(signal);
  const pedido = prepararImagemPublicacao(url, "privado", variante);
  return pedido ? pedido.buscar(signal) : null;
}
