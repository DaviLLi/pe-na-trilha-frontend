// Componente lateral.
// Recebe props para abrir o modal e mostrar a quantidade de posts.
function Sidebar({ onNovoPost, postCount }) {
  return (
    <aside className='sidebar'>
      {/* Imagem de capa do perfil */}
      <img
        className='cover'
        src='https://vocenaneve.com.br/wp-content/uploads/2021/03/paisagens-com-montanhas-de-neve.jpg'
        alt='Capa'
      />

      <div className='profile'>
        {/* Avatar do usuário */}
        <div className='avatarWithBorder'>
          <img
            src='https://github.com/DaviLLi.png'
            className='avatar'
            alt='Foto do usuário'
          />
        </div>

        <strong>Davi Martinelli</strong>
        <span>Trilheiro</span>
      </div>

      {/* Mostra a quantidade de posts vinda por props */}
      <h2 className='title'>
        {postCount} <strong className='subTitle'>Posts</strong>
      </h2>

      <footer>
        <a
          href='#'
          onClick={(e) => {
            // Evita o comportamento padrão do link.
            e.preventDefault();

            // Dispara o evento recebido por props para abrir o modal.
            onNovoPost();
          }}
        >
          Novo Post
        </a>
      </footer>
    </aside>
  );
}

export default Sidebar;
