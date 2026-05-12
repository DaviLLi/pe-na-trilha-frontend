// Importa a imagem do logo para usar no componente.
import logo from "../assets/logo.png";

const navItems = [
  { id: "trilhas", label: "Trilhas" },
  { id: "sobre", label: "Sobre" },
  { id: "sprint", label: "Sprint 2" },
];

// Componente responsável pelo topo da aplicação.
function Header({ paginaAtual, aoNavegar }) {
  return (
    <header className='header'>
      <div className='brand'>
        {/* Logo do projeto */}
        <img src={logo} alt='Logo do Pé na Trilha' />

        {/* Área do nome do sistema */}
        <div className='nome'>
          <h1>Pé na Trilha</h1>
        </div>
      </div>

      <nav className='mainNav' aria-label='Navegação principal'>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={paginaAtual === item.id ? "navLink active" : "navLink"}
            type='button'
            onClick={() => aoNavegar(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

export default Header;
