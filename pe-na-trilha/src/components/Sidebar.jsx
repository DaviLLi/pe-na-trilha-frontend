import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import logo from "../assets/logo.png";

const links = [
  { to: "/trilhas", label: "Início", mobileLabel: "Início", icon: "home" },
  { to: "/perfil", label: "Perfil", mobileLabel: "Perfil", icon: "profile" },
  { to: "/trilhas/nova", label: "Nova publicação", mobileLabel: "Nova", icon: "plus" },
  { to: "/ajuda", label: "Central de Ajuda", mobileLabel: "Ajuda", icon: "help" },
  { to: "/medalhas", label: "Guia de Medalhas", mobileLabel: "Medalhas", icon: "medal" },
];

const iconPaths = {
  home: <><path d="m3.5 10 8.5-7 8.5 7v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" /><path d="M9 20.5v-7h6v7" /></>,
  profile: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  plus: <><path d="M12 4v16M4 12h16" /></>,
  medal: <><circle cx="12" cy="9" r="5" /><path d="m8.5 13-1 8 4.5-2.5 4.5 2.5-1-8" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 1 1 4.1 1.7c-1 .9-1.8 1.2-1.8 2.8M12 17h.01" /></>,
  logout: <><path d="M10 4H5.5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1H10" /><path d="M13 8l4 4-4 4M17 12H8" /></>,
};

function NavIcon({ name }) {
  return <svg className="navIcon" viewBox="0 0 24 24" aria-hidden="true">{iconPaths[name]}</svg>;
}

function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [erroLogout, setErroLogout] = useState("");

  const sair = async () => {
    setErroLogout("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setErroLogout("Não foi possível encerrar a sessão. Tente novamente.");
    }
  };

  return (
    <aside className="productSidebar">
      <NavLink className="productBrand" to="/trilhas" aria-label="Pé na Trilha — início">
        <img src={logo} alt="" />
        <span>PÉ NA<br />TRILHA</span>
      </NavLink>
      <nav className="productNav" aria-label="Navegação principal">
        {links.map(({ to, label, mobileLabel, icon }) => (
          <NavLink key={to} end={to === "/trilhas"} to={to} aria-label={label} title={label} className={({ isActive }) => isActive ? "productNavLink active" : "productNavLink"}>
            <NavIcon name={icon} /><span className="productNavLabel">{label}</span><span className="productNavShortLabel">{mobileLabel}</span>
          </NavLink>
        ))}
        {usuario ? (
          <button className="productNavLink desktopAuthLink" type="button" onClick={sair}><NavIcon name="logout" />Sair</button>
        ) : (
          <NavLink className="productNavLink desktopAuthLink" to="/login"><NavIcon name="logout" />Entrar</NavLink>
        )}
      </nav>
      {usuario ? (
        <button className="mobileAuthLink" type="button" onClick={sair}><NavIcon name="logout" />Sair</button>
      ) : (
        <NavLink className="mobileAuthLink" to="/login"><NavIcon name="logout" />Entrar</NavLink>
      )}
      {erroLogout ? <p className="sidebarError" role="alert">{erroLogout}</p> : null}
    </aside>
  );
}

export default Sidebar;
