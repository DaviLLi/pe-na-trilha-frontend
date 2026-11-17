import { useAuth } from "../contexts/useAuth";
import { obterPermissoesTrilha } from "../services/trilhaPermissoes.js";
import { Link } from "react-router-dom";
import CarrosselPost from "./CarrosselPost.jsx";
import DetalhesTrilha from "./DetalhesTrilha.jsx";

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
        d='M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7'
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
  const { usuario } = useAuth();
  const permissoes = obterPermissoesTrilha(trilha, usuario);

  return (
    <article className='post'>
      <header className='postHeader'>
        <h2 className='postTitle'>{trilha.titulo}</h2>
        {permissoes.editar || permissoes.excluir ? <div className='actionButtons'>
          {permissoes.editar ? <Link
            className='editBtn'
            to={`/trilhas/${trilha._id}/editar`}
            aria-label={`Editar trilha ${trilha.titulo}`}
            title='Editar trilha'
          >
            <EditIcon />
          </Link> : null}
          {permissoes.excluir ? <button
            className='deleteBtn'
            type='button'
            onClick={onDelete}
            disabled={excluindo}
            aria-label={`Excluir trilha ${trilha.titulo}`}
            title='Excluir trilha'
          >
            <TrashIcon />
          </button> : null}
        </div> : null}
      </header>

      <div className='postContent'>
        <p className='postText'>{trilha.descricao}</p>
        <div className='postAddress'>
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z' />
            <circle cx='12' cy='10' r='2.2' />
          </svg>
          <span>{trilha.endereco}</span>
        </div>
        <DetalhesTrilha trilha={trilha} />
      </div>

      <CarrosselPost key={trilha._id} fotos={trilha.fotos || []} titulo={trilha.titulo} />
    </article>
  );
}

export default PostTrilha;
