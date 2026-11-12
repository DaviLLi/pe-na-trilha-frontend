import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import About from "./components/About";
import Presentation from "./components/Presentation";
import Home from "./pages/Home";
import ListaTrilhas from "./pages/ListaTrilhas";
import CadastroTrilha from "./pages/CadastroTrilha";
import EditarTrilha from "./pages/EditarTrilha";
import Login from "./pages/Login";
import CadastroUsuario from "./pages/CadastroUsuario";
import { useAuth } from "./contexts/useAuth";
import "./styles/style.css";

function ApenasVisitantes({ children }) {
  const { autenticado } = useAuth();
  return autenticado ? <Navigate to="/trilhas" replace /> : children;
}

function App() {
  const { pathname } = useLocation();
  const esconderHeader = pathname === "/login" || pathname === "/cadastro";

  return (
    <>
      {!esconderHeader ? <Header /> : null}

      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/trilhas' element={<ListaTrilhas />} />
        <Route path='/trilhas/nova' element={<CadastroTrilha />} />
        <Route path='/trilhas/:id/editar' element={<EditarTrilha />} />
        <Route path='/sobre' element={<About />} />
        <Route path='/sprint-3' element={<Presentation />} />
        <Route
          path='/login'
          element={
            <ApenasVisitantes>
              <Login />
            </ApenasVisitantes>
          }
        />
        <Route
          path='/cadastro'
          element={
            <ApenasVisitantes>
              <CadastroUsuario />
            </ApenasVisitantes>
          }
        />
        <Route path='*' element={<Home />} />
      </Routes>
    </>
  );
}

export default App;
