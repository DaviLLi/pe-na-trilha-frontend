import MedalhaPerfil from "../components/MedalhaPerfil";
import { calcularMedalha } from "../data/niveisMedalhas.js";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

function Perfil() {
  const { usuario } = useAuth();
  const conquista = calcularMedalha(usuario?.trilhasAprovadas);
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
          <span className="pageEyebrow">Seu espaço na comunidade</span>
          <h1 id="profile-name">{nome}</h1>
          {nomeUsuario ? <p className="profileHandle">@{nomeUsuario}</p> : null}
        </div>
        <div className="profileEditGroup">
          <button className="secondaryButton profileEdit" type="button" disabled title="A API ainda não oferece edição de perfil">Editar perfil</button>
          <span>A edição de perfil ainda não está disponível.</span>
        </div>
      </section>

      <section className="profileOverview" aria-label="Informações do perfil">
        <div className="profileInfoCard">
          <span className="profileSectionLabel">Informações</span>
          {usuario?.email ? <p><span>E-mail</span><strong>{usuario.email}</strong></p> : <p className="profileUnavailable">E-mail não informado pela conta.</p>}
        </div>
        <div className="profileInfoCard profileStats" aria-label="Publicações e aprovações">
          <span className="profileSectionLabel">Na trilha</span>
          <p><strong>—</strong><span>trilhas publicadas</span></p>
          <p><strong>{conquista?.quantidade ?? "—"}</strong><span>trilhas aprovadas</span></p>
          <small>As contagens aparecem quando são fornecidas pela sua conta.</small>
        </div>
        <MedalhaPerfil quantidadeAprovada={usuario?.trilhasAprovadas} />
      </section>

      <section className="profilePosts" aria-labelledby="profile-posts-title">
        <div className="profilePostsHeading"><div><span className="pageEyebrow">Contribuições</span><h2 id="profile-posts-title">Publicações</h2></div><Link to="/trilhas/nova">Nova publicação <span aria-hidden="true">↗</span></Link></div>
        <div className="profilePostsEmpty"><span aria-hidden="true">＋</span><strong>Suas publicações aparecerão aqui</strong><p>A API ainda não informa quais trilhas pertencem a este perfil.</p></div>
      </section>
    </main>
  );
}

export default Perfil;
