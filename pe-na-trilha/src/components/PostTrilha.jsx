// Componente menor só para desenhar o ícone da lixeira.
function TrashIcon() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true'>
      <path
        d='M9 3.75h6a1 1 0 0 1 1 1V6h3.25a.75.75 0 0 1 0 1.5h-1.02l-.82 10.6A2.25 2.25 0 0 1 15.17 20H8.83a2.25 2.25 0 0 1-2.24-1.9L5.77 7.5H4.75a.75.75 0 0 1 0-1.5H8V4.75a1 1 0 0 1 1-1Zm5.5 2.25v-.75h-5V6h5Zm-6.4 1.5.78 10.32a.75.75 0 0 0 .75.68h4.74a.75.75 0 0 0 .75-.68l.78-10.32H8.1Zm2.15 2.35a.75.75 0 0 1 .75.75v4.8a.75.75 0 0 1-1.5 0v-4.8a.75.75 0 0 1 .75-.75Zm3.5 0a.75.75 0 0 1 .75.75v4.8a.75.75 0 0 1-1.5 0v-4.8a.75.75 0 0 1 .75-.75Z'
        fill='none'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.8'
      />
    </svg>
  );
}

// Componente responsável por mostrar um card de trilha publicada.
// Props:
// - post: objeto com os dados do post
// - onDelete: evento para apagar o post
function PostTrilha({ post, onDelete }) {
  return (
    <article className='post'>
      <header className='postHeader'>
        {/* Bloco com avatar e informações do autor */}
        <div className='profileGroup'>
          <div className='avatarWithBorderPost'>
            <img
              src={post.avatar}
              className='avatarPost'
              alt={`Foto de ${post.autor}`}
            />
          </div>

          <div className='userInfo'>
            <h2>{post.autor}</h2>
            <span>{post.papel}</span>
          </div>
        </div>

        <div className='actionButtons'>
          {/* Botão/evento para apagar o post */}
          <button
            className='deleteBtn'
            type='button'
            onClick={onDelete}
            aria-label={`Apagar post ${post.titulo}`}
            title='Apagar post'
          >
            <TrashIcon />
          </button>
        </div>
      </header>

      {/* Conteúdo principal do post */}
      <h3 className='postTitle'>{post.titulo}</h3>
      <p className='postText'>{post.descricao}</p>
      <span className='postAddress'>{post.endereco}</span>
    </article>
  );
}

export default PostTrilha;
