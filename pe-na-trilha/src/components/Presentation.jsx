const criterios = [
  "Frontend React organizado com componentes e páginas.",
  "Navegação entre telas com React Router.",
  "Requisições HTTP centralizadas com Axios.",
  "CRUD completo de trilhas integrado à API REST.",
  "Backend Node.js, Express, Mongoose e MongoDB Atlas.",
];

function Presentation() {
  return (
    <section className='contentPage'>
      <div className='pageHero'>
        <span>Roteiro da apresentação</span>
        <h1>Sprint 3 - Integração Full Stack</h1>
        <p>
          Nesta etapa, o Pé na Trilha deixou de armazenar dados no navegador e
          passou a consumir uma API conectada ao MongoDB.
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
          <h2>Organização do código</h2>
          <p>
            O frontend separa componentes, páginas e serviços. O backend separa
            configuração, model, controller, rotas e tratamento de erros.
          </p>
        </article>

        <article className='infoPanel'>
          <h2>Fluxo dos dados</h2>
          <p>
            As páginas chamam o serviço Axios, a API processa a requisição e o
            Mongoose persiste os campos título, descrição e endereço no
            MongoDB Atlas.
          </p>
        </article>
      </div>
    </section>
  );
}

export default Presentation;
