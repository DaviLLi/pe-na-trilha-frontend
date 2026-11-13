import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/useAuth.js";
import { obterMensagemErro } from "../services/api.js";
import SelecionarFotosPublicacao from "./SelecionarFotosPublicacao.jsx";

export default function EditorFotoPerfil({ aoFechar }) {
  const { atualizarFotoPerfil } = useAuth();
  const [fotos, setFotos] = useState([]);
  const [erroSelecao, setErroSelecao] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const ativo = useRef(false), operacao = useRef(null), ocupado = useRef(false);
  useEffect(() => { ativo.current = true;return () => { ativo.current = false;operacao.current?.abort(); }; }, []);
  async function salvar(evento) {
    evento.preventDefault();
    if (ocupado.current || fotos.length !== 1 || erroSelecao) return;
    ocupado.current = true;setSalvando(true);setErro("");setSucesso("");
    const controller = new AbortController();operacao.current = controller;
    try {
      await atualizarFotoPerfil(fotos[0], { signal: controller.signal });
      if (ativo.current && !controller.signal.aborted) { setFotos([]);setSucesso("Foto de perfil atualizada."); }
    } catch (falha) {
      if (ativo.current && !controller.signal.aborted) setErro(obterMensagemErro(falha));
    } finally { if (ativo.current && !controller.signal.aborted) { ocupado.current = false;setSalvando(false); } }
  }
  return <section id="editar-foto-perfil" className="profileEditPanel" aria-labelledby="foto-perfil-titulo">
    <h2 id="foto-perfil-titulo">Foto de perfil</h2><p>Confira a prévia e salve para atualizar sua foto.</p>
    <form onSubmit={salvar} aria-busy={salvando}>
      <SelecionarFotosPublicacao rotulo="Selecionar foto de perfil" maximo={1} fotos={fotos} aoAlterar={(novas) => { setFotos(novas);setSucesso(""); }} desabilitado={salvando} erro={erroSelecao} aoErro={setErroSelecao} />
      {erro ? <p className="storageAlert" role="alert">{erro}</p> : null}
      {sucesso ? <p className="profileEditSuccess" role="status">{sucesso}</p> : null}
      <div className="modalButtons"><button className="primaryButton" type="submit" disabled={salvando || fotos.length !== 1 || Boolean(erroSelecao)}>{salvando ? "Enviando foto..." : "Salvar foto"}</button><button className="secondaryButton" type="button" onClick={aoFechar}>Fechar</button></div>
    </form>
  </section>;
}
