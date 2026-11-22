import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { listarTrilhasPendentes, moderarTrilha } from "../services/trilhasService.js";
import { useImagemPublicacao } from "../contexts/useImagemPublicacao.js";
import { obterMensagemErro } from "../services/api.js";
import DetalhesTrilha from "../components/DetalhesTrilha.jsx";

function FotoAdministrativa({ foto, titulo }) {
  const imagem = useImagemPublicacao(foto, { variante: "miniatura" });
  return <figure className="adminPhoto" aria-busy={imagem.estado === "carregando"}>
    {imagem.url ? <img src={imagem.url} alt={`Foto para moderação de ${titulo}`} loading="lazy"
      onError={imagem.aoFalhar} /> : null}
    {imagem.estado !== "pronta" ? <figcaption role="status">{imagem.estado === "carregando" ? "Carregando foto..." : imagem.mensagem}</figcaption> : null}
  </figure>;
}

function PublicacaoPendente({ publicacao, aoDecidir }) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const operacao = useRef(null);
  const [revisaoObsoleta, setRevisaoObsoleta] = useState(false);
  const emAndamento = useRef(false);
  useEffect(() => () => operacao.current?.abort(), []);
  const autor = typeof publicacao.proprietario === "string" ? publicacao.proprietario : publicacao.proprietario?._id;
  const formularioId = `rejeicao-${publicacao._id}`;
  const motivoId = `motivo-${publicacao._id}`;
  const erroId = `erro-${publicacao._id}`;

  async function decidir(status) {
    if (emAndamento.current || revisaoObsoleta) return;
    if (status === "rejected" && (!motivo.trim() || motivo.length > 2000)) {
      setErro("Informe o motivo da rejeição, com até 2000 caracteres."); return;
    }
    const controller = new AbortController();
    operacao.current = controller; emAndamento.current = true;
    setEnviando(true); setErro("");
    try {
      const decisao = { status, revisao: publicacao.revisao };
      if (status === "rejected") decisao.motivo = motivo.trim();
      const confirmada = await moderarTrilha(publicacao._id, decisao, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (confirmada?._id !== publicacao._id || confirmada.status !== status) {
        setErro("A API não confirmou a decisão solicitada. Atualize a fila antes de tentar novamente.");
        return;
      }
      aoDecidir(publicacao._id, status);
    } catch (falha) {
      if (!controller.signal.aborted && !axios.isCancel(falha)) {
        if (falha.response?.status === 409) setRevisaoObsoleta(true);
        setErro(obterMensagemErro(falha));
      }
    } finally {
      emAndamento.current = false;
      if (!controller.signal.aborted) setEnviando(false);
    }
  }
  return <article className="adminPostCard" data-publicacao-id={publicacao._id} aria-busy={enviando}>
    <h2>{publicacao.titulo}</h2>
    <p>{publicacao.descricao}</p><p className="adminPostAddress">{publicacao.endereco}</p>
    <p className="adminPostAuthor">Autor: {autor || "Não informado"}</p>
    <DetalhesTrilha trilha={publicacao} />
    {publicacao.fotos?.length ? <div className="adminPhotos">
      {publicacao.fotos.map((foto) => typeof foto.url === "string" && foto.url.startsWith("/admin/trilhas/") ?
        <FotoAdministrativa key={`${foto._id}:${foto.url}:${foto.updatedAt || ""}`} foto={foto} titulo={publicacao.titulo} /> :
        <figure className="adminPhoto" key={foto._id}><figcaption>Foto indisponível</figcaption></figure>)}
    </div> : <p>Nenhuma foto cadastrada.</p>}
    <div className="adminDecision">
      <form className="adminRejectionForm" id={formularioId} onSubmit={(evento) => { evento.preventDefault(); decidir("rejected"); }}>
      <label htmlFor={motivoId}>Motivo da rejeição</label>
      <textarea id={motivoId} value={motivo} onChange={(evento) => setMotivo(evento.target.value)}
        required maxLength={2000} disabled={enviando} aria-describedby={erro ? erroId : undefined} />
      {erro ? <p id={erroId} className="storageAlert" role="alert">{erro}</p> : null}
      </form>
      <div className="adminDecisionButtons">
        <button className="primaryButton" type="button" disabled={enviando || revisaoObsoleta} onClick={() => decidir("approved")}>Aprovar</button>
        <button className="secondaryButton" type="submit" form={formularioId} disabled={enviando || revisaoObsoleta}>Rejeitar</button>
      </div>
      {enviando ? <p role="status">Enviando decisão...</p> : null}
    </div>
  </article>;
}

function FilaPendentes() {
  const [versao, setVersao] = useState(0);
  const [publicacoes, setPublicacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const decisoes = useRef(new Set());
  useEffect(() => {
    const controller = new AbortController();
    let ativa = true;
    async function carregar() {
      setCarregando(true); setErro("");
      try {
        const dados = await listarTrilhasPendentes({ signal: controller.signal });
        if (!Array.isArray(dados)) throw new Error("Resposta de moderação inválida.");
        if (ativa && !controller.signal.aborted) setPublicacoes(dados);
      } catch (falha) {
        if (ativa && !controller.signal.aborted && !axios.isCancel(falha)) setErro(obterMensagemErro(falha));
      } finally { if (ativa && !controller.signal.aborted) setCarregando(false); }
    }
    const consultaInicial = carregar();
    async function incluirConcluida({ detail: id }) {
      if (typeof id !== "string") return;
      await consultaInicial;
      if (!ativa || decisoes.current.has(id)) return;
      try {
        const dados = await listarTrilhasPendentes({ signal: controller.signal });
        if (!ativa || !Array.isArray(dados) || decisoes.current.has(id)) return;
        const nova = dados.find((item) => item._id === id);
        if (nova) {
          setPublicacoes((atuais) => atuais.some((item) => item._id === id) ? atuais : [...atuais, nova]);
        }
      } catch {
        // A atualização manual da fila continua disponível em caso de falha.
      }
    }
    window.addEventListener("publicacoes:atualizadas", incluirConcluida);
    return () => {
      ativa = false;
      controller.abort();
      window.removeEventListener("publicacoes:atualizadas", incluirConcluida);
    };
  }, [versao]);
  function decidida(id, status) {
    decisoes.current.add(id);
    setPublicacoes((atuais) => atuais.filter((item) => item._id !== id));
    setAviso(status === "approved" ? "Publicação aprovada." : "Publicação rejeitada.");
  }
  return <section className="adminQueue" aria-label="Fila de moderação">
    <button className="adminRefreshButton" type="button" disabled={carregando} onClick={() => setVersao((atual) => atual + 1)}>Atualizar fila</button>
    {aviso ? <p className="adminNotice" role="status">{aviso}</p> : null}
    {carregando ? <p role="status">Carregando publicações pendentes...</p> : erro ?
      <p className="storageAlert" role="alert">{erro}</p> : publicacoes.length ?
        publicacoes.map((item) => <PublicacaoPendente key={item._id + ":" + item.revisao} publicacao={item} aoDecidir={decidida} />) :
        <div className="integrationEmpty moderationEmpty" role="status"><div><h2>Nenhuma publicação pendente.</h2><p>A fila de moderação está vazia.</p></div></div>}
  </section>;
}

export default function Admin() {
  const { usuario } = useAuth();
  const autorizado = usuario?.perfil === "admin" && Boolean(usuario._id);
  return <main className="productMain adminPage">
    <header className="productPageHeading adminHeading">
      <div><span className="pageEyebrow">Área administrativa</span><h1>Publicações pendentes</h1>
        <p>Revise as informações antes de liberar uma trilha para a comunidade.</p></div>
      <span className="integrationStatus"><i aria-hidden="true" />{autorizado ? "Moderação" : "Acesso restrito"}</span>
    </header>
    {autorizado ? <FilaPendentes key={usuario._id} /> :
      <section className="integrationEmpty moderationEmpty" role="alert"><p>Acesso administrativo obrigatório.</p></section>}
  </main>;
}
