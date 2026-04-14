// Importa a imagem do logo para usar no componente.
import logo from "../assets/logo.png";

// Componente responsável pelo topo da aplicação.
function Header() {
  return (
    <header className='header'>
      {/* Logo do projeto */}
      <img src={logo} alt='Logo do Pé na Trilha' />

      {/* Área do nome do sistema */}
      <div className='nome'>
        <h1>Pé na Trilha</h1>
      </div>
    </header>
  );
}

export default Header;
