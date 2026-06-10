const About = () => (
  <section className='contentPage'>
    <div className='pageHero'>
      <span>Sobre o projeto</span>
      <h1>Pé na Trilha conecta pessoas a experiências reais de trilha.</h1>
      <p>
        A proposta do aplicativo é reunir relatos, rotas e informações úteis
        para quem quer explorar novos caminhos com mais confiança.
      </p>
    </div>

    <div className='infoGrid'>
      <article className='infoPanel'>
        <h2>Problema a ser resolvido</h2>
        <p>
          Hoje faltam espaços digitais onde trilheiros encontrem informações
          claras sobre percursos. Quem busca novas trilhas enfrenta dificuldades
          para localizar descrições e endereços em um único lugar.
        </p>
      </article>

      <article className='infoPanel'>
        <h2>Solução com valor agregado</h2>
        <p>
          O Pé na Trilha oferece uma plataforma simples para cadastrar, consultar,
          editar e excluir informações essenciais sobre trilhas.
        </p>
      </article>

      <article className='infoPanel'>
        <h2>Nicho de mercado</h2>
        <p>
          O foco inicial são trilheiros iniciantes, experientes, grupos de
          trilha, turistas e amantes de natureza em Florianópolis e região. Como
          público secundário, entram guias locais, lojas de equipamentos e blogs
          regionais.
        </p>
      </article>
    </div>
  </section>
);

export default About;
