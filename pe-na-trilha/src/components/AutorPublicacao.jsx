import { useState } from "react";
import DataPublicacao from "./DataPublicacao.jsx";

export default function AutorPublicacao({ autor, createdAt }) {
  const [fotoFalhou, setFotoFalhou] = useState(null);
  const nome = autor?.nomeCompleto || autor?.nomeUsuario || "Autor indisponível";
  return <div className="postAuthor">
    {autor?.fotoPerfil && fotoFalhou !== autor.fotoPerfil ? <img className="userAvatarOutline" src={autor.fotoPerfil} alt={`Foto de ${nome}`} loading="lazy" onError={() => setFotoFalhou(autor.fotoPerfil)} /> : <span className="postAuthorAvatar" aria-hidden="true">{nome.charAt(0).toLocaleUpperCase("pt-BR")}</span>}
    <div><strong>{nome}</strong>{autor?.nomeUsuario ? <span>@{autor.nomeUsuario}</span> : null}<DataPublicacao createdAt={createdAt} /></div>
  </div>;
}
