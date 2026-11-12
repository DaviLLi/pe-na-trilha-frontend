import TrilhaForm from "../components/TrilhaForm";

function CadastroTrilha() {
  return (
    <main className='formPage newPostPage'>
      <section className='formCard'>
        <div className='modalHeader'>
          <span className="pageEyebrow">Compartilhe com a comunidade</span>
          <h1>Nova publicação</h1>
          <p>Registre o percurso e suas características para orientar quem pretende visitá-lo.</p>
        </div>

        <div className="publishCompatibility" role="status">
          <strong>Interface pronta; salvamento depende da API</strong>
          <p>O contrato documentado para trilhas aceita título, descrição e localização. Não há suporte documentado para as dez respostas, duração, fotos no envio ou estado de aprovação. Por isso, os dados abaixo não são enviados nem publicados até a API oferecer persistência e aprovação administrativa.</p>
        </div>

        <TrilhaForm incluirDetalhes envioIndisponivel />
      </section>
      <aside className="newPostAside">
        <span className="newPostAsideIcon" aria-hidden="true">⌁</span>
        <span className="pageEyebrow">Um bom registro</span>
        <h2>Informação clara faz diferença na trilha.</h2>
        <p>O contrato atual da API cobre título, descrição e localização. As respostas do questionário e a duração aguardam suporte para serem salvas.</p>
        <div className="newPostFieldHint"><strong>Também necessário</strong><span>Persistência dos detalhes e fila de aprovação administrativa</span></div>
      </aside>
    </main>
  );
}

export default CadastroTrilha;
