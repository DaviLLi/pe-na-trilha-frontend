import { Link } from "react-router-dom";

function Sidebar({ trilhaCount, usuario }) {
  return (
    <aside className='sidebar' aria-label='Resumo das trilhas'>
      <div className='sidebarMark' aria-hidden='true'>↗</div>
      <span className='sidebarEyebrow'>Pé na Trilha</span>
      <h2>{usuario?.nomeUsuario ? `Olá, ${usuario.nomeUsuario}` : "Boas aventuras"}</h2>
      <p className='sidebarDescription'>Seu próximo caminho começa com uma descoberta.</p>

      <div className='trailCount'>
        <strong>{trilhaCount}</strong>
        <span>{trilhaCount === 1 ? "trilha publicada" : "trilhas publicadas"}</span>
      </div>

      <footer>
        <Link to='/trilhas/nova'><span aria-hidden='true'>＋</span> Compartilhar trilha</Link>
      </footer>
    </aside>
  );
}

export default Sidebar;
