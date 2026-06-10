import { Link } from "react-router-dom";

function Sidebar({ trilhaCount }) {
  return (
    <aside className='sidebar'>
      <img
        className='cover'
        src='https://vocenaneve.com.br/wp-content/uploads/2021/03/paisagens-com-montanhas-de-neve.jpg'
        alt='Montanhas cobertas por neve'
      />

      <div className='profile'>
        <div className='avatarWithBorder'>
          <img
            src='https://github.com/DaviLLi.png'
            className='avatar'
            alt='Foto de Davi Martinelli'
          />
        </div>

        <strong>Davi Martinelli</strong>
        <span>Trilheiro</span>
      </div>

      <h2 className='title'>
        {trilhaCount}{" "}
        <strong className='subTitle'>
          {trilhaCount === 1 ? "Trilha" : "Trilhas"}
        </strong>
      </h2>

      <footer>
        <Link to='/trilhas/nova'>Nova Trilha</Link>
      </footer>
    </aside>
  );
}

export default Sidebar;
