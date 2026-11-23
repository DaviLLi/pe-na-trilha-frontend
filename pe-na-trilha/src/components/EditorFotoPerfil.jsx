import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../contexts/useAuth.js";
import { obterMensagemErro } from "../services/api.js";
import { validarFotosPublicacao } from "../services/publicacaoValidation.js";
import { AJUSTE_INICIAL_AVATAR, gerarArquivoAvatar } from "../services/recorteAvatar.js";
import RecorteAvatar from "./RecorteAvatar.jsx";

export default function EditorFotoPerfil({ desabilitado = false, bloqueio, aoOcupado }) {
  const { usuario, atualizarFotoPerfil, excluirFotoPerfil } = useAuth();
  const [arquivo, setArquivo] = useState(null), [imagem, setImagem] = useState(null);
  const [ajuste, setAjuste] = useState({ ...AJUSTE_INICIAL_AVATAR });
  const [erroSelecao, setErroSelecao] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [acaoAtual, setAcaoAtual] = useState(null);
  const salvando = Boolean(acaoAtual);
  const ativo = useRef(false), operacao = useRef(null), ocupado = useRef(false);
  const inputId = useId();
  useEffect(() => { ativo.current = true;return () => { ativo.current = false;operacao.current?.abort(); }; }, []);
  useEffect(() => {
    if (!arquivo) return;
    let atual = true, bitmap;
    async function decodificar() {
      try {
        bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
        if (!atual) { bitmap.close();return; }
        setImagem(bitmap);
      } catch { if (atual) setErroSelecao("Não foi possível abrir essa imagem. Escolha outra foto JPEG, PNG ou WebP."); }
    }
    decodificar();return () => { atual = false;bitmap?.close(); };
  }, [arquivo]);
  async function executar(acao, solicitar, mensagem, mensagemFalha) {
    if (ocupado.current || desabilitado || bloqueio?.current) return;
    ocupado.current = true;
    if (bloqueio) bloqueio.current = "foto";
    aoOcupado?.(true);
    setAcaoAtual(acao);
    setErro("");
    setSucesso("");
    const controller = new AbortController();
    operacao.current = controller;
    const { signal } = controller;
    try {
      await solicitar(signal);
      if (ativo.current && !signal.aborted) {
        setArquivo(null);
        setImagem(null);
        setErroSelecao("");
        setSucesso(mensagem);
      }
    } catch (falha) {
      if (ativo.current && !signal.aborted) setErro(falha.response ? obterMensagemErro(falha) : mensagemFalha);
    } finally {
      if (ativo.current && !signal.aborted) {
        ocupado.current = false;
        if (bloqueio) bloqueio.current = null;
        aoOcupado?.(false);
        setAcaoAtual(null);
      }
    }
  }

  function salvar(evento) {
    evento.preventDefault();
    if (!imagem || erroSelecao) return;
    return executar("envio", async (signal) => {
      const recortada = await gerarArquivoAvatar(imagem, ajuste);
      if (ativo.current && !signal.aborted) await atualizarFotoPerfil(recortada, { signal });
    }, "Foto de perfil atualizada.", "Não foi possível confirmar o envio da foto. Verifique sua conexão antes de tentar novamente.");
  }

  function remover() {
    if (ocupado.current || desabilitado || bloqueio?.current || !usuario?.fotoPerfil) return;
    if (!window.confirm("Remover sua foto de perfil?")) return;
    return executar("remocao", (signal) => excluirFotoPerfil({ signal }),
      "Foto de perfil removida.", "Não foi possível confirmar a remoção da foto. Verifique o perfil antes de tentar novamente.");
  }
  return <section id="editar-foto-perfil" className="profilePhotoSection" aria-labelledby="foto-perfil-titulo">
    <div className="profilePhotoHeading"><h3 id="foto-perfil-titulo">Sua foto de perfil</h3><p>Escolha uma foto e ajuste o enquadramento antes de salvar.</p></div>
    <form onSubmit={salvar} aria-busy={salvando}>
      <div className="avatarFilePicker"><label className="secondaryButton" htmlFor={inputId}>{arquivo ? "Escolher outra foto" : "Selecionar foto"}</label>
        <input id={inputId} type="file" aria-label="Selecionar foto de perfil" accept="image/jpeg,image/png,image/webp" disabled={salvando || desabilitado} onChange={(evento) => {
          const selecionado = evento.target.files?.[0];evento.target.value = "";
          if (!selecionado || ocupado.current || desabilitado) return;
          const invalido = validarFotosPublicacao([selecionado]);setErroSelecao(invalido);setSucesso("");
          if (invalido) return;
          setErro("");setImagem(null);setAjuste({ ...AJUSTE_INICIAL_AVATAR });setArquivo(selecionado);
        }} />
        <span>JPEG, PNG ou WebP · até 5 MiB</span>
      </div>
      {arquivo && !imagem && !erroSelecao ? <p role="status">Preparando prévia...</p> : null}
      {imagem ? <RecorteAvatar imagem={imagem} ajuste={ajuste} aoAlterar={setAjuste} desabilitado={salvando || desabilitado} /> : null}
      {erroSelecao ? <p className="fieldError" role="alert">{erroSelecao}</p> : null}
      {erro ? <p className="storageAlert" role="alert">{erro}</p> : null}
      {sucesso ? <p className="profileEditSuccess" role="status">{sucesso}</p> : null}
      <div className="profilePhotoActions"><button className="primaryButton" type="submit" disabled={salvando || desabilitado || !imagem || Boolean(erroSelecao)}>{acaoAtual === "envio" ? "Enviando foto..." : "Salvar foto"}</button>
        {usuario?.fotoPerfil ? <button className="secondaryButton" type="button" disabled={salvando || desabilitado} onClick={remover}>{acaoAtual === "remocao" ? "Removendo foto…" : "Remover foto de perfil"}</button> : null}
        {arquivo ? <button className="secondaryButton" type="button" disabled={salvando || desabilitado} onClick={() => { setArquivo(null);setImagem(null);setErroSelecao("");setErro(""); }}>Cancelar seleção</button> : null}
      </div>
    </form>
  </section>;
}
