import { CanceledError } from "axios";
import { prepararImagemPublicacao } from "./imagensPublicacoesService.js";

const LIMITE_BYTES = 24 * 1024 * 1024;
const LIMITE_IMAGENS = 48;
const VALIDADE_MS = 2 * 60 * 1000;

export class ErroDecodificacaoImagem extends Error {
  constructor() {
    super("Não foi possível exibir a foto.");
  }
}

function identidadeFoto(endereco) {
  const { origin, pathname } = new URL(endereco);
  return origin + pathname.replace(/^\/(?:admin\/trilhas|trilhas\/minhas)\//i, "/trilhas/");
}

async function validarImagem(blob, url, signal) {
  const cabecalho = new DataView(await blob.slice(0, 12).arrayBuffer());
  if (cabecalho.byteLength !== 12 || cabecalho.getUint32(0) !== 0x52494646
    || cabecalho.getUint32(8) !== 0x57454250 || cabecalho.getUint32(4, true) + 8 !== blob.size) {
    throw new ErroDecodificacaoImagem();
  }

  signal.throwIfAborted();
  const imagem = new Image();
  const cancelar = () => imagem.removeAttribute("src");
  signal.addEventListener("abort", cancelar, { once: true });
  try {
    imagem.src = url;
    await imagem.decode();
  } catch {
    signal.throwIfAborted();
    throw new ErroDecodificacaoImagem();
  } finally {
    signal.removeEventListener("abort", cancelar);
    cancelar();
  }
}

export function criarCacheImagensPublicacoes({
  limiteBytes = LIMITE_BYTES,
  limiteImagens = LIMITE_IMAGENS,
  validadeMs = VALIDADE_MS,
  validar = validarImagem,
} = {}) {
  const entradas = new Map();
  let timer;
  let encerrado = false;

  function revogar(entrada) {
    if (!entrada.url) return;
    URL.revokeObjectURL(entrada.url);
    entrada.url = null;
  }

  function retirar(entrada) {
    if (entradas.get(entrada.chave) === entrada) entradas.delete(entrada.chave);
    entrada.descartada = true;
    if (!entrada.bytes) entrada.controller.abort();
    if (!entrada.bytes || entrada.consumidores === 0) revogar(entrada);
  }

  function ajustarLimites() {
    clearTimeout(timer);
    const agora = Date.now();
    let bytes = 0;
    let imagens = 0;
    for (const entrada of entradas.values()) {
      if (!entrada.bytes) continue;
      if (entrada.consumidores === 0 && entrada.expiraEm <= agora) {
        retirar(entrada);
        continue;
      }
      bytes += entrada.bytes;
      imagens++;
    }
    let proximaExpiracao = Infinity;
    for (const entrada of entradas.values()) {
      if (!entrada.bytes || entrada.consumidores > 0) continue;
      if (bytes > limiteBytes || imagens > limiteImagens) {
        bytes -= entrada.bytes;
        imagens--;
        retirar(entrada);
      } else {
        proximaExpiracao = Math.min(proximaExpiracao, entrada.expiraEm);
      }
    }
    if (Number.isFinite(proximaExpiracao)) {
      timer = setTimeout(ajustarLimites, Math.max(0, proximaExpiracao - Date.now()));
      timer.unref?.();
    }
  }

  async function carregar(entrada, buscar) {
    const { signal } = entrada.controller;
    try {
      const blob = await buscar(signal);
      signal.throwIfAborted();
      entrada.url = URL.createObjectURL(blob);
      await validar(blob, entrada.url, signal);
      signal.throwIfAborted();
      entrada.bytes = blob.size;
      ajustarLimites();
      return entrada.url;
    } catch (erro) {
      retirar(entrada);
      throw erro;
    }
  }

  function adquirir(url, { contexto = "privado", variante = "detalhe", versao = "" } = {}) {
    if (encerrado) throw new CanceledError("Sessão da imagem encerrada.");
    const pedido = prepararImagemPublicacao(url, contexto, variante);
    if (!pedido) return null;
    ajustarLimites();
    // O endereço inclui origem, política de acesso, publicação, foto e variante.
    const chave = JSON.stringify([pedido.endereco, versao]);
    let entrada = entradas.get(chave);
    if (entrada) {
      entradas.delete(chave);
    } else {
      entrada = { chave, foto: identidadeFoto(pedido.endereco), controller: new AbortController(), consumidores: 0, bytes: 0, url: null };
      entrada.resultado = carregar(entrada, pedido.buscar);
    }
    entrada.consumidores++;
    entradas.set(chave, entrada);

    let liberado = false;
    return {
      resultado: entrada.resultado,
      invalidar() {
        retirar(entrada);
        ajustarLimites();
      },
      liberar() {
        if (liberado) return;
        liberado = true;
        entrada.consumidores--;
        if (entrada.consumidores > 0) return;
        if (entrada.descartada || !entrada.bytes) {
          retirar(entrada);
        } else {
          entrada.expiraEm = Date.now() + validadeMs;
          entradas.delete(chave);
          entradas.set(chave, entrada);
        }
        ajustarLimites();
      },
    };
  }

  function limpar() {
    clearTimeout(timer);
    for (const entrada of entradas.values()) retirar(entrada);
  }

  return {
    adquirir,
    limpar,
    invalidarFoto(url) {
      let pedido;
      try {
        pedido = prepararImagemPublicacao(url, "privado", "detalhe");
      } catch {
        return;
      }
      if (!pedido) return;
      const foto = identidadeFoto(pedido.endereco);
      for (const entrada of entradas.values()) {
        if (entrada.foto === foto) retirar(entrada);
      }
      ajustarLimites();
    },
    encerrar() {
      encerrado = true;
      limpar();
    },
  };
}
