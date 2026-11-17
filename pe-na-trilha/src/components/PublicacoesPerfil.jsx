import AutorPublicacao from "./AutorPublicacao.jsx";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth.js";
import { permissoesPublicacaoPropria } from "../services/publicacaoValidation.js";
import { listarMinhasTrilhas, excluirTrilha, reenviarTrilha } from "../services/trilhasService.js";
import { buscarImagemPrivada } from "../services/imagensPublicacoesService.js";
import { obterMensagemErro } from "../services/api.js";
import GaleriaPublicacao from "./GaleriaPublicacao.jsx";
import DetalhesTrilha from "./DetalhesTrilha.jsx";

const ESTADOS = { pending: "Pendente", approved: "Aprovada", rejected: "Rejeitada" };

export function FotoPrivadaPerfil({ url, titulo, aoAbrir }) {
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
      {aoAbrir ? <button className="photoOpenControl" type="button" aria-label={`Ampliar foto de ${titulo}`} onClick={aoAbrir}><span>Ampliar ↗</span></button> : null}
      {imagem.url ? <img src={imagem.url} alt={`Foto da publicação ${titulo}`} loading="lazy"
        onLoad={() => setImagem((atual) => ({ ...atual, estado: "pronta" }))} onError={falhouAoExibir} /> : null}
      {imagem.estado !== "pronta" ? <figcaption role="status">
        {imagem.estado === "carregando" ? "Carregando foto..." : imagem.mensagem}
      </figcaption> : null}
    </figure>
  );
}

export default function PublicacoesPerfil({ aoAtualizar } = {}) {
  const { usuario } = useAuth();
  const [galeria, setGaleria] = useState(null);
  const [versao, setVersao] = useState(0);
  const [mensagem, setMensagem] = useState("");
  const [falhaAcao, setFalhaAcao] = useState("");
  const [ocupada, setOcupada] = useState(false);
  const operacao = useRef(null);
  const ativa = useRef(false);
  useEffect(() => { ativa.current = true; return () => { ativa.current = false; operacao.current?.abort(); }; }, []);
  const [publicacoes, setPublicacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let ativa = true;
    async function carregar() {
      setCarregando(true); setErro("");
      aoAtualizar?.({ carregando: true });
      try {
        const dados = await listarMinhasTrilhas({ signal: controller.signal });
        if (!Array.isArray(dados)) throw new Error("Resposta de publicações inválida.");
        if (ativa && !controller.signal.aborted) { setPublicacoes(dados); aoAtualizar?.({ publicacoes: dados, carregando: false }); }
      } catch (falha) {
        if (ativa && !controller.signal.aborted && !axios.isCancel(falha)) { setErro(obterMensagemErro(falha)); aoAtualizar?.({ carregando: false, erro: true }); }
      } finally {
        if (ativa && !controller.signal.aborted) { setCarregando(false); setOcupada(false); operacao.current = null; }
      }
    }
    carregar();
    return () => { ativa = false; controller.abort(); };
  }, [versao, aoAtualizar]);

  useEffect(() => {
    const atualizar = () => { if (!operacao.current && document.visibilityState === "visible") setVersao((atual) => atual + 1); };
    window.addEventListener("publicacoes:atualizadas", atualizar);window.addEventListener("focus", atualizar);document.addEventListener("visibilitychange", atualizar);
    return () => { window.removeEventListener("publicacoes:atualizadas", atualizar);window.removeEventListener("focus", atualizar);document.removeEventListener("visibilitychange", atualizar); };
  }, []);
  const selecionada = galeria ? publicacoes.find((p) => p._id === galeria.id) : null;

  async function executar(publicacao, tipo) {
    if (operacao.current) return;
    const permissoes = permissoesPublicacaoPropria(publicacao, usuario);
    if (!permissoes[tipo]) return;
    if (tipo === "excluir" && !window.confirm(`Excluir a publicação “${publicacao.titulo}” e suas fotos?`)) return;
    const controller = new AbortController(); operacao.current = controller;
    setOcupada(true); setMensagem(""); setFalhaAcao(""); setErro("");
    try {
      if (tipo === "excluir") await excluirTrilha(publicacao._id, { signal: controller.signal });
      else await reenviarTrilha(publicacao._id, { signal: controller.signal });
      if (ativa.current && !controller.signal.aborted) setMensagem(tipo === "excluir" ? "Publicação excluída." : "Publicação reenviada para aprovação.");
    } catch (falha) {
      if (ativa.current && !controller.signal.aborted) setFalhaAcao(`${obterMensagemErro(falha)} Confira o estado atualizado antes de tentar novamente.`);
    } finally {
      if (ativa.current && !controller.signal.aborted) { setVersao((atual) => atual + 1); }
    }
  }

  if (carregando) return <p className="profileUnavailable" role="status">Carregando suas publicações...</p>;
  if (erro) return <div><p className="storageAlert" role="alert">{erro}</p><button type="button" onClick={() => setVersao((atual) => atual + 1)}>Atualizar publicações</button></div>;
  if (!publicacoes.length) return <div className="profilePostsEmpty" role="status">
    {mensagem ? <p>{mensagem}</p> : null}
    {falhaAcao ? <p role="alert">{falhaAcao}</p> : null}
    <Link className="profileFirstPostLink" to="/trilhas/nova" aria-label="Adicionar publicação"><span aria-hidden="true">＋</span></Link><strong>Nenhuma publicação ainda</strong><p>Suas contribuições aparecerão aqui.</p>
  </div>;
  return <div className="profilePostList">
    <button className="profileRefreshButton" type="button" disabled={ocupada} onClick={() => setVersao((atual) => atual + 1)}>Atualizar publicações</button>
    {mensagem ? <p role="status">{mensagem}</p> : null}
    {falhaAcao ? <p role="alert">{falhaAcao}</p> : null}
    {publicacoes.map((publicacao) => <article className="profilePostCard" data-publicacao-id={publicacao._id} key={publicacao._id}>
      <AutorPublicacao autor={publicacao.proprietario === usuario?._id ? usuario : publicacao.autor} createdAt={publicacao.createdAt} />
      <header className="profilePostHeader"><h3>{publicacao.titulo}</h3>
        <span className="profilePostStatus" data-status={publicacao.status}>{Object.hasOwn(ESTADOS, publicacao.status) ? ESTADOS[publicacao.status] : "Estado não informado"}</span>
      </header>
      <p>{publicacao.descricao}</p><p className="profilePostAddress">{publicacao.endereco}</p>
      <DetalhesTrilha trilha={publicacao} />
      {typeof publicacao.motivoRejeicao === "string" && publicacao.motivoRejeicao.trim() ?
        <p className="profileRejection"><strong>Motivo da rejeição:</strong> {publicacao.motivoRejeicao}</p> : null}
      {publicacao.fotos?.length ? <div className="profilePostPhotos">
        {publicacao.fotos.map((foto, indice) => typeof foto.url === "string" && foto.url.startsWith("/trilhas/minhas/") ?
          <FotoPrivadaPerfil key={`${foto._id}:${foto.url}:${foto.updatedAt || ""}`} url={foto.url} titulo={publicacao.titulo} aoAbrir={() => setGaleria({ id: publicacao._id, indice })} /> :
          <figure className="profilePostPhoto" key={foto._id}><button className="photoOpenControl" type="button" aria-label={`Ampliar foto de ${publicacao.titulo}`} onClick={() => setGaleria({ id: publicacao._id, indice })}><span>Ver fotos ↗</span></button><figcaption>Foto indisponível</figcaption></figure>)}
      </div> : <p className="profileUnavailable">Nenhuma foto cadastrada.</p>}
      <div className="ownerPublicationActions">
        {permissoesPublicacaoPropria(publicacao, usuario).editar ? <Link className="secondaryButton formLink ownerAction ownerEditButton" to={`/trilhas/${publicacao._id}/editar`} aria-disabled={ocupada} onClick={(evento) => { if (ocupada) evento.preventDefault(); }}>{publicacao.status === "rejected" ? "Corrigir publicação" : "Editar publicação"}</Link> : null}
        {permissoesPublicacaoPropria(publicacao, usuario).reenviar ? <button className="ownerAction ownerResubmitButton" type="button" disabled={ocupada} onClick={() => executar(publicacao, "reenviar")}>Reenviar para aprovação</button> : null}
        {permissoesPublicacaoPropria(publicacao, usuario).excluir ? <button className="ownerAction ownerDeleteButton" type="button" disabled={ocupada} onClick={() => executar(publicacao, "excluir")}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>Excluir publicação</button> : null}
      </div>
    </article>)}
    {selecionada?.fotos?.length ? <GaleriaPublicacao key={`${selecionada._id}:${selecionada.fotos.map((f) => `${f._id}:${f.updatedAt || ""}`).join(";")}`} fotos={selecionada.fotos} titulo={selecionada.titulo} contexto="autor" inicial={galeria.indice} aoFechar={() => setGaleria(null)} /> : null}
  </div>;
}
