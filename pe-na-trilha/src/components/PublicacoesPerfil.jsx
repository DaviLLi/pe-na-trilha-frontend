import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { listarMinhasTrilhas } from "../services/trilhasService.js";
import { buscarImagemPrivada } from "../services/imagensPublicacoesService.js";
import { obterMensagemErro } from "../services/api.js";
import DetalhesTrilha from "./DetalhesTrilha.jsx";

const ESTADOS = { pending: "Pendente", approved: "Aprovada", rejected: "Rejeitada" };

function FotoPrivadaPerfil({ url, titulo }) {
  const [imagem, setImagem] = useState({ estado: "carregando", url: null, mensagem: "" });
  const recursoAtual = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    let ativa = true, recurso;
    async function carregar() {
      try {
        const blob = await buscarImagemPrivada(url, { variante: "miniatura", signal: controller.signal });
        if (!ativa || controller.signal.aborted) return;
        if (!blob) { setImagem({ estado: "erro", url: null, mensagem: "Foto indisponível." }); return; }
        const objectUrl = URL.createObjectURL(blob);
        let revogada = false;
        recurso = { liberar() { if (!revogada) { URL.revokeObjectURL(objectUrl); revogada = true; } } };
        recursoAtual.current = recurso;
        setImagem({ estado: "carregando", url: objectUrl, mensagem: "" });
      } catch (erro) {
        if (ativa && !controller.signal.aborted && !axios.isCancel(erro)) {
          setImagem({ estado: "erro", url: null, mensagem: obterMensagemErro(erro) });
        }
      }
    }
    carregar();
    return () => { ativa = false; controller.abort(); recurso?.liberar(); };
  }, [url]);

  function falhouAoExibir() {
    recursoAtual.current?.liberar();
    recursoAtual.current = null;
    setImagem({ estado: "erro", url: null, mensagem: "Não foi possível exibir a foto." });
  }
  return (
    <figure className="profilePostPhoto" aria-busy={imagem.estado === "carregando"}>
      {imagem.url ? <img src={imagem.url} alt={`Foto da publicação ${titulo}`} loading="lazy"
        onLoad={() => setImagem((atual) => ({ ...atual, estado: "pronta" }))} onError={falhouAoExibir} /> : null}
      {imagem.estado !== "pronta" ? <figcaption role="status">
        {imagem.estado === "carregando" ? "Carregando foto..." : imagem.mensagem}
      </figcaption> : null}
    </figure>
  );
}

export default function PublicacoesPerfil() {
  const [publicacoes, setPublicacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let ativa = true;
    async function carregar() {
      try {
        const dados = await listarMinhasTrilhas({ signal: controller.signal });
        if (!Array.isArray(dados)) throw new Error("Resposta de publicações inválida.");
        if (ativa && !controller.signal.aborted) setPublicacoes(dados);
      } catch (falha) {
        if (ativa && !controller.signal.aborted && !axios.isCancel(falha)) setErro(obterMensagemErro(falha));
      } finally {
        if (ativa && !controller.signal.aborted) setCarregando(false);
      }
    }
    carregar();
    return () => { ativa = false; controller.abort(); };
  }, []);

  if (carregando) return <p className="profileUnavailable" role="status">Carregando suas publicações...</p>;
  if (erro) return <p className="storageAlert" role="alert">{erro}</p>;
  if (!publicacoes.length) return <div className="profilePostsEmpty" role="status">
    <span aria-hidden="true">＋</span><strong>Nenhuma publicação ainda</strong><p>Suas contribuições aparecerão aqui.</p>
  </div>;
  return <div className="profilePostList">
    {publicacoes.map((publicacao) => <article className="profilePostCard" key={publicacao._id}>
      <header className="profilePostHeader"><h3>{publicacao.titulo}</h3>
        <span className="profilePostStatus" data-status={publicacao.status}>{Object.hasOwn(ESTADOS, publicacao.status) ? ESTADOS[publicacao.status] : "Estado não informado"}</span>
      </header>
      <p>{publicacao.descricao}</p><p className="profilePostAddress">{publicacao.endereco}</p>
      <DetalhesTrilha trilha={publicacao} />
      {typeof publicacao.motivoRejeicao === "string" && publicacao.motivoRejeicao.trim() ?
        <p className="profileRejection"><strong>Motivo da rejeição:</strong> {publicacao.motivoRejeicao}</p> : null}
      {publicacao.fotos?.length ? <div className="profilePostPhotos">
        {publicacao.fotos.map((foto) => typeof foto.url === "string" && foto.url.startsWith("/trilhas/minhas/") ?
          <FotoPrivadaPerfil key={`${foto._id}:${foto.url}:${foto.updatedAt || ""}`} url={foto.url} titulo={publicacao.titulo} /> :
          <figure className="profilePostPhoto" key={foto._id}><figcaption>Foto indisponível</figcaption></figure>)}
      </div> : <p className="profileUnavailable">Nenhuma foto cadastrada.</p>}
    </article>)}
  </div>;
}
