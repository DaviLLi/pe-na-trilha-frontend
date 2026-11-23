import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/useAuth";
import logo from "../assets/logo.png";

const navItems = [
  { path: "/trilhas", label: "Trilhas" },
];

function Header() {
  const { autenticado, usuario, logout } = useAuth();
  const [erroLogout, setErroLogout] = useState("");

  const handleLogout = async () => {
    setErroLogout("");
    try {
      await logout();
    } catch {
      setErroLogout("Não foi possível encerrar a sessão. Tente novamente.");
    }
  };
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
        {autenticado ? (
          <button className='navLink' type='button' onClick={handleLogout}>
            Sair{usuario?.nomeUsuario ? ` (${usuario.nomeUsuario})` : ""}
          </button>
        ) : (
          <NavLink className='navLink' to='/login'>Entrar</NavLink>
        )}
      </nav>
      {erroLogout ? <span role='alert'>{erroLogout}</span> : null}
    </header>
  );
}

export default Header;
