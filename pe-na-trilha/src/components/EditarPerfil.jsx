import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/useAuth.js";
import { validarEdicaoPerfil } from "../services/authValidation.js";
import { obterMensagemErro } from "../services/api.js";

export default function EditarPerfil({ aoCancelar }) {
  const { usuario, atualizarPerfil } = useAuth();
  const [campos, setCampos] = useState(() => ({ nomeCompleto: usuario.nomeCompleto || "", nomeUsuario: usuario.nomeUsuario || "", email: usuario.email || "" }));
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const ativa = useRef(false), controle = useRef(null), ocupada = useRef(false);
  useEffect(() => { ativa.current = true; return () => { ativa.current = false; controle.current?.abort(); }; }, []);

  async function salvar(evento) {
    evento.preventDefault();
    if (ocupada.current) return;
    const invalidos = validarEdicaoPerfil(campos); setErros(invalidos); setSucesso(""); setErro("");
    if (Object.keys(invalidos).length) { document.getElementById(`perfil-${Object.keys(invalidos)[0]}`)?.focus(); return; }
    ocupada.current = true; setSalvando(true);
    const controller = new AbortController(); controle.current = controller;
    try {
      await atualizarPerfil(campos, { signal: controller.signal });
      if (ativa.current && !controller.signal.aborted) setSucesso("Perfil atualizado com sucesso.");
    } catch (falha) {
      if (ativa.current && !controller.signal.aborted) setErro(obterMensagemErro(falha));
    } finally {
      if (ativa.current && !controller.signal.aborted) { ocupada.current = false; setSalvando(false); }
    }
  }
  return <section className="profileEditPanel" id="editar-perfil" aria-labelledby="editar-perfil-titulo">
    <header><span className="pageEyebrow">Sua conta</span><h2 id="editar-perfil-titulo">Editar perfil</h2><p>Atualize como você se apresenta e seu e-mail de acesso.</p></header>
    <form onSubmit={salvar} noValidate aria-busy={salvando}>
      {[['nomeCompleto', 'Nome completo', 'text', 'name'], ['nomeUsuario', 'Nome de usuário', 'text', 'username'], ['email', 'E-mail', 'email', 'email']].map(([chave, rotulo, tipo, autocomplete]) => <div className="formField" key={chave}>
        <label htmlFor={`perfil-${chave}`}>{rotulo}</label>
        <input id={`perfil-${chave}`} name={chave} type={tipo} autoComplete={autocomplete} required value={campos[chave]} disabled={salvando} aria-invalid={Boolean(erros[chave])} aria-describedby={erros[chave] ? `perfil-${chave}-erro` : undefined} onChange={(evento) => {
          setCampos((atuais) => ({ ...atuais, [chave]: evento.target.value })); setErros((atuais) => ({ ...atuais, [chave]: "" })); setSucesso("");
        }} />
        {erros[chave] ? <p className="fieldError" id={`perfil-${chave}-erro`}>{erros[chave]}</p> : null}
      </div>)}
      {erro ? <p className="storageAlert" role="alert">{erro}</p> : null}
      {sucesso ? <p className="profileEditSuccess" role="status">{sucesso}</p> : null}
      <div className="modalButtons"><button className="primaryButton" type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar perfil"}</button><button className="secondaryButton" type="button" disabled={salvando} onClick={aoCancelar}>Fechar edição</button></div>
    </form>
  </section>;
}
