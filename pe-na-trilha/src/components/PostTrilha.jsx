import { useAuth } from "../contexts/useAuth";
import { obterPermissoesTrilha } from "../services/trilhaPermissoes.js";
import { useState } from "react";
import { Link } from "react-router-dom";
import { obterUrlImagemPublica } from "../services/imagensPublicacoesService.js";
import GaleriaPublicacao from "./GaleriaPublicacao.jsx";
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

// A chave pela URL reinicia os eventos/estado quando muda a foto, sem efeitos
// de sincronização e sem herdar uma falha da imagem anterior.
function FotoDoFeed({ url, titulo, quantidade, aoAbrir }) {
  const [estado, setEstado] = useState("carregando");
  const falhou = estado === "erro";
  return (
    <figure className="postPhoto" aria-busy={estado === "carregando"}>
      <button className="photoOpenControl" type="button" aria-label={`Ampliar fotos de ${titulo}`} onClick={aoAbrir}><span>Ampliar ↗</span></button>
      {falhou ? (
        <figcaption className="postPhotoStatus" role="status">Não foi possível carregar a foto.</figcaption>
      ) : (
        <>
          <img
            src={url}
            alt={`Paisagem da trilha ${titulo}`}
            width="1600"
            height="800"
            loading="lazy"
            onLoad={() => setEstado("carregada")}
            onError={() => setEstado("erro")}
          />
          {estado === "carregando" ? <figcaption className="postPhotoStatus" role="status">Carregando foto...</figcaption> : null}
          {quantidade > 1 ? <span className="photoCount">{quantidade} fotos</span> : null}
        </>
      )}
    </figure>
  );
}

function PostTrilha({ trilha, onDelete, excluindo }) {
  const { usuario } = useAuth();
  const [galeria, setGaleria] = useState(false);
  const permissoes = obterPermissoesTrilha(trilha, usuario);
  const fotoDestaque = trilha.fotos?.[0];
  let urlFoto = null;
  try {
    urlFoto = obterUrlImagemPublica(fotoDestaque?.url, { variante: "miniatura" });
  } catch {
    // DTO antigo, contexto privado ou configuração inválida não derrubam o Feed
    // e nunca são usados como src alternativo ou registrados em logs.
  }

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

      {urlFoto ? (
        <FotoDoFeed key={urlFoto} url={urlFoto} titulo={trilha.titulo} quantidade={trilha.fotos.length} aoAbrir={() => setGaleria(true)} />
      ) : (
        <figure className="postPhoto postPhotoEmpty">
          {trilha.fotos?.length ? <button className="photoOpenControl" type="button" aria-label={`Ampliar fotos de ${trilha.titulo}`} onClick={() => setGaleria(true)}><span>Ver fotos ↗</span></button> : null}
          <figcaption>{fotoDestaque ? "Foto indisponível" : "Nenhuma foto cadastrada"}</figcaption>
        </figure>
      )}
      {galeria && trilha.fotos?.length ? <GaleriaPublicacao fotos={trilha.fotos} titulo={trilha.titulo} contexto="publico" aoFechar={() => setGaleria(false)} /> : null}
    </article>
  );
}

export default PostTrilha;
