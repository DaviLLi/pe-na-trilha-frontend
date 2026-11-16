import { Link } from "react-router-dom";

function ResultadoIcone({ incerto = false, foto = false }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{incerto ? <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.2-1.5 2.5M12 17h.01" /></> : foto ? <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m3 17 5-5 4 4 3-3 6 5" /></> : <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>}</svg>;
}

export default function ResultadoPublicacao({ resultado, envios, enviando }) {
  const criada = resultado === "criada";
  const confirmadas = envios.filter((envio) => envio.estado === "Envio confirmado").length;
  return <section className={`publicationResult${criada ? " publicationResultCreated" : " publicationResultUncertain"}`} aria-label="Resultado do cadastro">
    <div className="publicationResultEmblem"><ResultadoIcone incerto={!criada} /></div>
    <header className="publicationResultHeader"><span className="pageEyebrow">{criada ? "Sua contribuição foi registrada" : "Confira suas publicações"}</span>
      <h1>{criada ? "Publicação cadastrada como pendente" : "Cadastro sem confirmação"}</h1>
      <p>{criada ? "Obrigado por compartilhar esse lugar. Acompanhe o estado atual da publicação no seu Perfil." : "Consulte suas publicações antes de tentar cadastrar novamente."}</p>
    </header>
    {criada ? <div className="publicationPendingNote"><span className="publicationPendingDot" aria-hidden="true" /><div><strong>Aguardando aprovação administrativa</strong><p>A publicação aparecerá no Feed depois de ser aprovada.</p></div></div> : null}
    {criada ? <section className="publicationPhotoReceipt" aria-label="Confirmação das fotos">
      <div className="publicationPhotoReceiptTitle"><ResultadoIcone foto /><h2>Fotos da publicação</h2><span>{confirmadas} / {envios.length}</span></div>
      <p className="publicationUploadSummary" role="status">{enviando ? "Enviando fotos… Aguarde a conclusão." : !envios.length ? "Nenhuma foto selecionada." : `${confirmadas} ${confirmadas === 1 ? "foto com envio confirmado" : "fotos com envio confirmado"}.`}</p>
      {envios.length ? <ul aria-label="Envio das fotos">{envios.map((envio, indice) => <li key={indice} data-envio={envio.estado}>
        <span className="publicationPhotoNumber" aria-hidden="true">{String(indice + 1).padStart(2, "0")}</span>
        <div className="publicationFileInfo"><strong>Foto {indice + 1}</strong><span title={envio.nome}>{envio.nome}</span></div>
        <span className="publicationUploadState">{envio.estado === "Envio confirmado" ? <span aria-hidden="true">✓ </span> : null}{envio.estado}</span>
      </li>)}</ul> : null}
    </section> : null}
    <Link className="primaryButton formLink publicationResultLink" to="/perfil" aria-disabled={enviando} onClick={(evento) => { if (enviando) evento.preventDefault(); }}>Ver minhas publicações <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10" /></svg></Link>
    {enviando ? <small className="publicationResultHint">Aguarde o envio das fotos antes de continuar.</small> : null}
  </section>;
}
