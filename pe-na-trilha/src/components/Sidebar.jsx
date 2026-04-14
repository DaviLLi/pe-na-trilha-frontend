function Sidebar({ onNovoPost, postCount }) {
  return (
    <aside className='sidebar'>
      <img
        className='cover'
        src='https://vocenaneve.com.br/wp-content/uploads/2021/03/paisagens-com-montanhas-de-neve.jpg'
        alt='Capa'
      />

      <div className='profile'>
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

      <h2 className='title'>
        {postCount} <strong className='subTitle'>Posts</strong>
      </h2>

      <footer>
        <a
          href='#'
          onClick={(e) => {
            e.preventDefault();
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
