import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";

const navItems = [
  { path: "/trilhas", label: "Trilhas" },
  { path: "/sobre", label: "Sobre" },
  { path: "/sprint-3", label: "Sprint 3" },
];

function Header() {
  return (
    <header className='header'>
      <NavLink className='brand' to='/trilhas' aria-label='Ir para as trilhas'>
        <img src={logo} alt='Logo do Pé na Trilha' />
        <div className='nome'>
          <h1>Pé na Trilha</h1>
        </div>
      </NavLink>

      <nav className='mainNav' aria-label='Navegação principal'>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            className={({ isActive }) =>
              isActive ? "navLink active" : "navLink"
            }
            to={item.path}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export default Header;
