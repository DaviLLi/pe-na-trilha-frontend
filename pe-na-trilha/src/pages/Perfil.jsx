import { useCallback, useState } from "react";
import EditorFotoPerfil from "../components/EditorFotoPerfil.jsx";
import EditarPerfil from "../components/EditarPerfil.jsx";
import PublicacoesPerfil from "../components/PublicacoesPerfil.jsx";
import MedalhaPerfil from "../components/MedalhaPerfil";
import { contarPublicacoesProprias } from "../services/estatisticasPublicacoes.js";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

function Perfil() {
  const { usuario } = useAuth();
  const [editandoFoto, setEditandoFoto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [estatisticas, setEstatisticas] = useState(null);
  const usuarioId = usuario?._id;
  const receberPublicacoes = useCallback(({ publicacoes, carregando, erro }) => {
    const contagens = carregando || erro ? null : contarPublicacoesProprias(publicacoes, usuarioId);
    setEstatisticas({ usuarioId, carregando, contagens });
  }, [usuarioId]);
  const atuais = estatisticas?.usuarioId === usuarioId ? estatisticas : null;
  const contagens = atuais?.contagens;
  const carregandoContagens = Boolean(usuarioId) && (!atuais || atuais.carregando);
  const nome = usuario?.nomeCompleto || "Nome não informado";
  const nomeUsuario = usuario?.nomeUsuario;
  const foto = usuario?.fotoPerfil || usuario?.avatarUrl || usuario?.foto || usuario?.imagemPerfil;

  return (
    <main className="productMain profilePage">
      <header className="profileCover" aria-hidden="true" />
      <section className="profileIdentity" aria-labelledby="profile-name">
        <div className="profileAvatar">
          {foto ? <img src={foto} alt={`Foto de ${nome}`} /> : <span aria-hidden="true">{nome.charAt(0).toLocaleUpperCase("pt-BR")}</span>}
        </div>
        <div className="profileIdentityCopy">
          <h1 id="profile-name">{nome}</h1>
          {nomeUsuario ? <p className="profileHandle">@{nomeUsuario}</p> : null}
        </div>
        <div className="profileEditGroup">
          <button className="secondaryButton profileEdit" type="button" disabled={!usuario?._id} aria-expanded={editando} aria-controls="editar-perfil" onClick={() => setEditando((atual) => !atual)}>Editar perfil</button>
          <button className="secondaryButton profileEdit" type="button" disabled={!usuario?._id} aria-expanded={editandoFoto} aria-controls="editar-foto-perfil" onClick={() => setEditandoFoto((atual) => !atual)}>Alterar foto</button>
        </div>
      </section>

      {editandoFoto && usuario?._id ? <EditorFotoPerfil key={usuario._id} aoFechar={() => setEditandoFoto(false)} /> : null}
      {editando && usuario?._id ? <EditarPerfil key={usuario._id} aoCancelar={() => setEditando(false)} /> : null}

      <section className="profileOverview" aria-label="Informações do perfil">
        <div className="profileInfoCard">
          <span className="profileSectionLabel">Informações</span>
          {usuario?.email ? <p><span>E-mail</span><strong>{usuario.email}</strong></p> : <p className="profileUnavailable">E-mail não informado pela conta.</p>}
        </div>
        <div className="profileInfoCard profileStats" aria-label="Publicações e aprovações">
          <span className="profileSectionLabel">Na trilha</span>
          <p><strong data-contagem="publicadas">{contagens?.publicadas ?? "—"}</strong><span>trilhas publicadas</span></p>
          <p><strong data-contagem="aprovadas">{contagens?.aprovadas ?? "—"}</strong><span>trilhas aprovadas</span></p>
          <small role="status">{carregandoContagens ? "Carregando suas contagens…" : contagens ? "Total de publicações cadastradas. Somente aprovadas contam para a medalha." : "Não foi possível obter as contagens das suas publicações."}</small>
        </div>
        <MedalhaPerfil quantidadeAprovada={contagens?.aprovadas} carregando={carregandoContagens} />
      </section>

      <section className="profilePosts" aria-labelledby="profile-posts-title">
        <div className="profilePostsHeading"><div><span className="pageEyebrow">Contribuições</span><h2 id="profile-posts-title">Publicações</h2></div><Link to="/trilhas/nova">Nova publicação <span aria-hidden="true">↗</span></Link></div>
        {usuario?._id ? <PublicacoesPerfil key={usuario._id} aoAtualizar={receberPublicacoes} /> :
          <p className="profileUnavailable" role="status">Entre na sua conta para consultar suas publicações.</p>}
      </section>
    </main>
  );
}

export default Perfil;
