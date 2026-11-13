import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import TrilhaForm from "../components/TrilhaForm";
import GerenciarFotosPublicacao from "../components/GerenciarFotosPublicacao.jsx";
import { obterMensagemErro } from "../services/api.js";
import { buscarMinhaTrilha, atualizarTrilha } from "../services/trilhasService.js";
import { permissoesPublicacaoPropria } from "../services/publicacaoValidation.js";

function EditorPublicacao({ id, usuario }) {
  const [trilha, setTrilha] = useState(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [ocupado, setOcupado] = useState(true);
  const [reconciliada, setReconciliada] = useState(false);
  const [revisao, setRevisao] = useState(0);
  const [formulario, setFormulario] = useState(0);
  const ativo = useRef(false), controle = useRef(null), bloqueio = useRef(false);

  useEffect(() => {
    ativo.current = true;
    const controller = new AbortController(); controle.current = controller;
    buscarMinhaTrilha(id, { signal: controller.signal }).then((dados) => {
      if (ativo.current && !controller.signal.aborted) { setTrilha(dados); setReconciliada(true); }
    }).catch((falha) => {
      if (ativo.current && !controller.signal.aborted) setErro(obterMensagemErro(falha));
    }).finally(() => { if (ativo.current && !controller.signal.aborted) setOcupado(false); });
    return () => { ativo.current = false; controle.current?.abort(); };
  }, [id]);

  async function executar(operacao, sucesso, dados = false) {
    if (bloqueio.current || !reconciliada) return;
    bloqueio.current = true; setOcupado(true); setErro(""); setMensagem("");
    const controller = new AbortController(); controle.current = controller;
    const atual = () => ativo.current && !controller.signal.aborted;
    let confirmada = false;
    try {
      await operacao({ signal: controller.signal });
      if (!atual()) return;
      confirmada = true; setMensagem(sucesso);
    } catch (falha) {
      if (!atual()) return;
      setErro(`${obterMensagemErro(falha)} Confira os dados atualizados antes de tentar novamente.`);
    } finally {
      if (atual()) {
        setReconciliada(false);
        try {
          const atualizada = await buscarMinhaTrilha(id, { signal: controller.signal });
          if (atual()) { setTrilha(atualizada); setReconciliada(true); setRevisao((n) => n + 1); if (dados && confirmada) setFormulario((n) => n + 1); }
        } catch (falha) {
          if (atual()) setErro(`${obterMensagemErro(falha)} Não foi possível confirmar o estado atual. Atualize a publicação antes de continuar.`);
        } finally { if (atual()) { bloqueio.current = false; setOcupado(false); } }
      }
    }
  }

  const permissoes = permissoesPublicacaoPropria(trilha, usuario);
  return <main className="formPage ownerPublicationEditor"><section className="formCard" aria-busy={ocupado}>
    <div className="modalHeader"><h1>Editar publicação</h1><p>{trilha?.status === "approved" ? "Publicação aprovada: altere somente características e duração." : "Salve as correções. Publicações rejeitadas só voltam à análise após o reenvio explícito no Perfil."}</p></div>
    {erro ? <p className="storageAlert" role="alert">{erro}</p> : null}
    {mensagem ? <p role="status">{mensagem}</p> : null}
    {!trilha && ocupado ? <p role="status">Carregando publicação...</p> : null}
    {trilha?.motivoRejeicao ? <p className="profileRejection"><strong>Motivo da rejeição:</strong> {trilha.motivoRejeicao}</p> : null}
    {trilha && !permissoes.editar ? <p role="status">A edição não está disponível para sua conta ou para este estado.</p> : null}
    {trilha && permissoes.editar ? <>
      <TrilhaForm key={`${formulario}:${trilha.status}`} modoEdicao incluirDetalhes somenteDetalhes={trilha.status === "approved"} valoresIniciais={trilha} enviando={ocupado || !reconciliada} destinoCancelar="/perfil" textoBotao="Salvar alterações" aoEnviar={(dados) => {
        if (!Object.keys(dados).length) { setMensagem("Nenhuma alteração para salvar."); return; }
        executar((config) => atualizarTrilha(id, dados, config), "Alterações salvas. O estado da publicação foi preservado.", true);
      }} />
      <GerenciarFotosPublicacao publicacao={trilha} permitido={permissoes.fotos} ocupado={ocupado || !reconciliada} executar={executar} revisao={revisao} />
    </> : null}
    {!reconciliada && !ocupado ? <button type="button" onClick={executarAtualizacao}>Atualizar publicação</button> : null}
    <Link className="secondaryButton formLink" to="/perfil">Voltar ao Perfil</Link>
  </section></main>;

  async function executarAtualizacao() {
    if (bloqueio.current) return;
    bloqueio.current = true; setOcupado(true);
    const controller = new AbortController(); controle.current = controller;
    try {
      const dados = await buscarMinhaTrilha(id, { signal: controller.signal });
      if (ativo.current && !controller.signal.aborted) { setTrilha(dados); setReconciliada(true); setErro(""); setRevisao((n) => n + 1); setFormulario((n) => n + 1); }
    } catch (falha) { if (ativo.current && !controller.signal.aborted) setErro(obterMensagemErro(falha)); }
    finally { if (ativo.current && !controller.signal.aborted) { bloqueio.current = false; setOcupado(false); } }
  }
}

export default function EditarTrilha() {
  const { usuario } = useAuth();
  const { id } = useParams();
  return usuario?._id ? <EditorPublicacao key={`${usuario._id}:${id}`} id={id} usuario={usuario} /> : <p role="status">Entre na sua conta para editar suas publicações.</p>;
}
