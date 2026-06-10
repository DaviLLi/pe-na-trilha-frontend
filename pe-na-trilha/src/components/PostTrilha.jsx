import { Link } from "react-router-dom";

function EditIcon() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true'>
      <path
        d='m4 16.5-.5 4 4-.5L19 8.5 15.5 5 4 16.5Zm9.8-9.8 3.5 3.5'
        fill='none'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.8'
      />
    </svg>
  );
}

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

function PostTrilha({ trilha, onDelete, excluindo }) {
  return (
    <article className='post'>
      <header className='postHeader'>
        <div className='profileGroup'>
          <div className='avatarWithBorderPost'>
            <img
              src='https://github.com/DaviLLi.png'
              className='avatarPost'
              alt='Foto de Davi Martinelli'
            />
          </div>

          <div className='userInfo'>
            <h2>Davi Martinelli</h2>
            <span>Trilheiro</span>
          </div>
        </div>

        <div className='actionButtons'>
          <Link
            className='editBtn'
            to={`/trilhas/${trilha._id}/editar`}
            aria-label={`Editar trilha ${trilha.titulo}`}
            title='Editar trilha'
          >
            <EditIcon />
          </Link>
          <button
            className='deleteBtn'
            type='button'
            onClick={onDelete}
            disabled={excluindo}
            aria-label={`Excluir trilha ${trilha.titulo}`}
            title='Excluir trilha'
          >
            <TrashIcon />
          </button>
        </div>
      </header>

      <h3 className='postTitle'>{trilha.titulo}</h3>
      <p className='postText'>{trilha.descricao}</p>
      <span className='postAddress'>{trilha.endereco}</span>
    </article>
  );
}

export default PostTrilha;
