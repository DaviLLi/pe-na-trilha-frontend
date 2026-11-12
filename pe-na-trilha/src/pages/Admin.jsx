function Admin() {
  return (
    <main className="productMain adminPage">
      <header className="productPageHeading adminHeading">
        <div>
          <span className="pageEyebrow">Área administrativa</span>
          <h1>Publicações pendentes</h1>
          <p>Revise as informações antes de liberar uma trilha para a comunidade.</p>
        </div>
        <span className="integrationStatus"><i aria-hidden="true" /> Integração indisponível</span>
      </header>
      <section className="integrationEmpty moderationEmpty" role="status" aria-live="polite">
        <span className="moderationIcon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.2c0 4.6 3.1 8 7.5 9.8 4.4-1.8 7.5-5.2 7.5-9.8V6L12 3Z" /><path d="M8.5 12h7" /></svg>
        </span>
        <div>
          <h2>A fila ainda não está conectada</h2>
          <p>A API atual não fornece publicações pendentes nem ações para aprovar ou rejeitar. Nenhum cartão ou dado de exemplo foi incluído.</p>
        </div>
      </section>
    </main>
  );
}

export default Admin;
