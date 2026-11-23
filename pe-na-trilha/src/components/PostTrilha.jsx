import AutorPublicacao from "./AutorPublicacao.jsx";
import CarrosselPost from "./CarrosselPost.jsx";
import DetalhesTrilha from "./DetalhesTrilha.jsx";

function PostTrilha({ trilha }) {
  return (
    <article className='post'>
      <AutorPublicacao autor={trilha.autor} createdAt={trilha.createdAt} />
      <header className='postHeader'>
        <h2 className='postTitle'>{trilha.titulo}</h2>
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
