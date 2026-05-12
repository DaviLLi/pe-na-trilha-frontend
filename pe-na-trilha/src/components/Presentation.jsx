const criterios = [
  "Projeto Vite organizado em componentes React.",
  "Menu com tres paginas: trilhas, sobre e sprint 2.",
  "Formulario controlado com titulo, descricao e endereco.",
  "Listagem dinamica dos posts cadastrados.",
  "Persistencia dos dados com localStorage.",
];

function Presentation() {
  return (
    <section className='contentPage'>
      <div className='pageHero'>
        <span>Roteiro da apresentacao</span>
        <h1>Sprint 2 - Mini Aplicativo React</h1>
        <p>
          Esta pagina ajuda o grupo a demonstrar rapidamente o que foi
          implementado, onde cada parte fica no codigo e como os dados continuam
          salvos depois de recarregar a aplicacao.
        </p>
      </div>

      <div className='infoGrid'>
        <article className='infoPanel'>
          <h2>O que mostrar no app</h2>
          <ul>
            {criterios.map((criterio) => (
              <li key={criterio}>{criterio}</li>
            ))}
          </ul>
        </article>

        <article className='infoPanel'>
          <h2>Organizacao do codigo</h2>
          <p>
            Os componentes visuais ficam em <strong>src/components</strong>, os
            estilos em <strong>src/styles</strong> e a regra de armazenamento em{" "}
            <strong>src/services/postsStorage.js</strong>.
          </p>
        </article>

        <article className='infoPanel'>
          <h2>Dificuldades e aprendizados</h2>
          <p>
            A principal evolucao foi transformar uma tela de posts em um mini
            aplicativo navegavel, mantendo estado, formulario controlado,
            renderizacao dinamica e persistencia local de forma simples.
          </p>
        </article>
      </div>
    </section>
  );
}

export default Presentation;
