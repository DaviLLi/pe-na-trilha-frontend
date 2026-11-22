import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  alterarAdministrador, mensagemGerenciamentoAdmin, perdeuAcessoGerenciamento,
} from "../services/administradoresService.js";
import "../styles/gerenciamentoAdministradores.css";

function ConfirmarAlteracao({ operacao, enviando, erro, aoConfirmar, aoFechar }) {
  const dialogo = useRef(null);
  const campoSenha = useRef(null);
  const removendo = operacao.acao === "remover";

  useEffect(() => {
    const elemento = dialogo.current;
    elemento.showModal();
    campoSenha.current.focus();
    return () => elemento.close();
  }, []);

  useEffect(() => {
    if (erro) campoSenha.current?.focus();
  }, [erro]);

  function enviar(evento) {
    evento.preventDefault();
    const campo = campoSenha.current;
    const senha = campo.value;
    campo.value = "";
    if (senha) void aoConfirmar(senha);
  }

  return (
    <dialog className="adminManageDialog" aria-labelledby="admin-manage-dialog-title"
      aria-describedby="admin-manage-dialog-description" ref={dialogo} closedby={enviando ? "none" : "closerequest"}
      onCancel={(evento) => { evento.preventDefault(); aoFechar(); }}>
      <form onSubmit={enviar} aria-busy={enviando}>
        <h2 id="admin-manage-dialog-title">{removendo ? "Remover administrador" : "Promover administrador"}</h2>
        <p id="admin-manage-dialog-description">
          {removendo ? "Confirme a remoção do acesso administrativo de" : "Confirme a promoção da conta"}{" "}
          <strong>{operacao.email}</strong>.
        </p>
        <div className="formField">
          <label htmlFor="admin-manage-password">Sua senha atual</label>
          <input id="admin-manage-password" ref={campoSenha} type="password" autoComplete="current-password"
            required disabled={enviando} aria-describedby={erro ? "admin-manage-operation-error" : undefined} />
        </div>
        {erro ? <p id="admin-manage-operation-error" className="storageAlert adminManageFeedback" role="alert">{erro}</p> : null}
        {enviando ? <p className="adminManageMuted" role="status">Enviando confirmação…</p> : null}
        <div className="adminManageActions">
          <button className="secondaryButton" type="button" disabled={enviando} onClick={aoFechar}>Cancelar</button>
          <button className={removendo ? "adminManageDanger" : "primaryButton"} type="submit" disabled={enviando}>
            {removendo ? "Confirmar remoção" : "Confirmar promoção"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function ListaAdministradores({ lista, bloqueada, aoRemover }) {
  return (
    <>
      <ul className="adminManageList">
        {[...lista].sort((a, b) => Number(b.principal) - Number(a.principal)).map((conta) => (
          <li key={conta._id} className="adminManageAccount" data-principal={conta.principal}>
            <div className="adminManageIdentity">
              <h3>{conta.nomeCompleto}</h3>
              <p>{conta.email}</p>
            </div>
            {conta.principal ? <span className="adminManagePrincipal">Administrador principal</span> : (
              <button className="adminManageDanger" type="button" disabled={bloqueada}
                aria-label={"Remover " + conta.email} onClick={() => aoRemover(conta.email)}>
                Remover
              </button>
            )}
          </li>
        ))}
      </ul>
      {lista.every((conta) => conta.principal) ? (
        <p className="adminManageMuted">Nenhum administrador comum cadastrado.</p>
      ) : null}
    </>
  );
}

export default function GerenciamentoAdministradores({ consulta }) {
  const [email, definirEmail] = useState("");
  const [operacao, definirOperacao] = useState(null);
  const [enviando, definirEnviando] = useState(false);
  const [aviso, definirAviso] = useState("");
  const [erroOperacao, definirErroOperacao] = useState("");
  const envio = useRef(null);

  useEffect(() => () => envio.current?.abort(), []);

  if (consulta.bloqueado) {
    return <Navigate to="/admin" replace state={{ avisoGerenciamento: consulta.erro }} />;
  }

  function iniciar(acao, alvo) {
    if (envio.current || consulta.carregando || !consulta.lista) return;
    definirAviso("");
    definirErroOperacao("");
    definirOperacao({ acao, email: alvo });
  }

  function fechar() {
    if (!envio.current) definirOperacao(null);
  }

  async function confirmar(senha) {
    if (!operacao || envio.current || consulta.carregando || !consulta.lista) return;
    const { acao, email: alvo } = operacao;
    const controller = new AbortController();
    envio.current = controller;
    definirEnviando(true);
    definirErroOperacao("");
    try {
      await alterarAdministrador(acao, { email: alvo, senha }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (acao === "promover") definirEmail("");
      definirOperacao(null);
      definirAviso(acao === "promover" ? "Administrador promovido com sucesso." : "Administrador removido com sucesso.");
      consulta.recarregar();
    } catch (falha) {
      if (controller.signal.aborted) return;
      const mensagem = mensagemGerenciamentoAdmin(falha, true);
      if (perdeuAcessoGerenciamento(falha)) {
        definirOperacao(null);
        consulta.bloquear(mensagem);
      } else {
        definirErroOperacao(mensagem);
      }
    } finally {
      envio.current = null;
      if (!controller.signal.aborted) definirEnviando(false);
    }
  }

  const bloqueada = consulta.carregando || enviando;
  return (
    <main className="productMain adminManagePage">
      <header className="productPageHeading">
        <h1>Gerenciamento de administradores</h1>
        <p>Consulte quem tem acesso administrativo e gerencie a equipe de moderação.</p>
      </header>
      {aviso ? <p className="adminNotice adminManageFeedback" role="status">{aviso}</p> : null}
      {consulta.lista ? (
        <div className="adminManageGrid">
          <section className="adminManagePanel" aria-labelledby="admin-manage-list-title" aria-busy={consulta.carregando}>
            <div className="adminManageSectionHeading">
              <h2 id="admin-manage-list-title">Administradores</h2>
              <button className="adminRefreshButton" type="button" disabled={bloqueada} onClick={consulta.recarregar}>
                Atualizar lista
              </button>
            </div>
            {consulta.carregando ? <p className="adminManageMuted" role="status">Atualizando administradores…</p> :
              <ListaAdministradores lista={consulta.lista} bloqueada={bloqueada} aoRemover={(alvo) => iniciar("remover", alvo)} />}
          </section>
          <section className="adminManagePanel" aria-labelledby="admin-manage-promote-title">
            <h2 id="admin-manage-promote-title">Promover administrador</h2>
            <p className="adminManageMuted">Informe o e-mail de uma conta cadastrada.</p>
            <form className="adminManageForm" onSubmit={(evento) => {
              evento.preventDefault();
              iniciar("promover", email.trim());
            }}>
              <div className="formField">
                <label htmlFor="admin-manage-email">E-mail da conta</label>
                <input id="admin-manage-email" type="email" required value={email}
                  onChange={(evento) => definirEmail(evento.target.value)} disabled={bloqueada} />
              </div>
              <button className="primaryButton" type="submit" disabled={bloqueada}>Promover administrador</button>
            </form>
          </section>
        </div>
      ) : consulta.carregando ? (
        <section className="integrationEmpty" role="status">Consultando acesso e administradores…</section>
      ) : (
        <section className="integrationEmpty">
          <p role="alert">{consulta.erro}</p>
          <button className="adminRefreshButton" type="button" onClick={consulta.recarregar}>Tentar novamente</button>
        </section>
      )}
      {operacao && consulta.lista ? <ConfirmarAlteracao operacao={operacao} enviando={enviando}
        erro={erroOperacao} aoConfirmar={confirmar} aoFechar={fechar} /> : null}
    </main>
  );
}

export function AvisoGerenciamentoAdministradores({ mensagem }) {
  return (
    <div className="adminManageAccessNotice">
      <p role="alert">{mensagem}</p>
      <Link to="/admin" replace className="secondaryButton">Dispensar aviso</Link>
    </div>
  );
}
