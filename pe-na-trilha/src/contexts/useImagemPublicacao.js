import { isCancel } from "axios";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import AuthContext from "./authContextValue.js";
import { criarCacheImagensPublicacoes, ErroDecodificacaoImagem } from "../services/cacheImagensPublicacoes.js";
import { obterUrlImagemPublica } from "../services/imagensPublicacoesService.js";
import { obterMensagemErro } from "../services/api.js";

function urlValida(url, contexto, variante) {
  if (contexto !== "publico") return url;
  try {
    return obterUrlImagemPublica(url, { variante }) ? url : null;
  } catch {
    return null;
  }
}

export function useImagemPublicacao(foto, { contexto = "privado", variante = "detalhe", lazy = false } = {}) {
  const compartilhado = useContext(AuthContext)?.cacheImagens;
  const local = useMemo(() => compartilhado ? null : criarCacheImagensPublicacoes(), [compartilhado]);
  const cache = compartilhado ?? local;
  const url = urlValida(foto?.url, contexto, variante);
  const versao = foto?.updatedAt || foto?.createdAt || "";
  const pedido = useMemo(() => ({ url, contexto, variante, versao }), [url, contexto, variante, versao]);
  const [resultado, setResultado] = useState(null);
  const [visivel, setVisivel] = useState(false);
  const ref = useRef(null);
  const recursoAtual = useRef(null);
  const observar = lazy && typeof IntersectionObserver !== "undefined";

  useEffect(() => () => local?.limpar(), [local]);

  useEffect(() => {
    if (!observar || visivel || !url || !ref.current) return;
    const observer = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) setVisivel(true);
    }, { rootMargin: "300px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [observar, url, visivel]);

  const podeCarregar = !observar || visivel;
  useEffect(() => {
    if (!pedido.url || !podeCarregar) return;
    let ativa = true;
    let recurso;
    async function carregar() {
      try {
        recurso = cache.adquirir(pedido.url, pedido);
        recursoAtual.current = recurso;
        const imagem = await recurso.resultado;
        if (ativa) setResultado({ pedido, cache, imagem });
      } catch (erro) {
        if (ativa && !isCancel(erro)) setResultado({ pedido, cache, erro });
      }
    }
    carregar();
    return () => {
      ativa = false;
      if (recursoAtual.current === recurso) recursoAtual.current = null;
      recurso?.liberar();
    };
  }, [cache, pedido, podeCarregar]);

  const atual = resultado?.pedido === pedido && resultado.cache === cache ? resultado : null;
  const mensagem = !url ? "Foto indisponível." : atual?.erro instanceof ErroDecodificacaoImagem
    ? atual.erro.message
    : atual?.erro ? obterMensagemErro(atual.erro) : "";

  return {
    ref,
    url: atual?.imagem ?? null,
    disponivel: Boolean(url),
    estado: mensagem ? "erro" : atual?.imagem ? "pronta" : "carregando",
    mensagem,
    aoFalhar() {
      const recurso = recursoAtual.current;
      recurso?.invalidar();
      recurso?.liberar();
      setResultado({ pedido, cache, erro: new ErroDecodificacaoImagem() });
    },
  };
}
