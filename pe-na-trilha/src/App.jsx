import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { destinoAposLogin } from "./services/navegacaoSegura.js";
import { encerrarSessaoCenarioFeed, obterCenarioFeed } from "./services/cenariosFeed.js";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import ListaTrilhas from "./pages/ListaTrilhas";
import CadastroTrilha from "./pages/CadastroTrilha";
import EditarTrilha from "./pages/EditarTrilha";
import Login from "./pages/Login";
import CadastroUsuario from "./pages/CadastroUsuario";
import Perfil from "./pages/Perfil";
import GuiaMedalhas from "./pages/GuiaMedalhas";
import Ajuda from "./pages/Ajuda";
import DocumentoLegal from "./pages/DocumentoLegal";
import Admin from "./pages/Admin";
import { useAuth } from "./contexts/useAuth";
import "./styles/style.css";
import "./styles/community.css";

function ApenasVisitantes({ children }) {
  const location = useLocation();
  const { usuario } = useAuth();
  const {
    autenticado,
    carregandoSessao,
    erroRestauracao,
    tentarRestaurarSessao,
  } = useAuth();
  if (carregandoSessao) return <SessaoCarregando />;
  if (erroRestauracao) {
    return <SessaoTemporariamenteIndisponivel tentarNovamente={tentarRestaurarSessao} />;
  }
  return autenticado && usuario?._id ? <Navigate to={destinoAposLogin(location.state?.from, usuario)} replace /> : children;
}

function SessaoTemporariamenteIndisponivel({ tentarNovamente }) {
  return (
    <main className="sessionStatePage">
      <section className="sessionStateCard" role="status">
        <span className="sessionStateMark" aria-hidden="true">!</span>
        <div>
          <span className="pageEyebrow">Conexão temporariamente indisponível</span>
          <h1>Não foi possível verificar sua sessão.</h1>
          <p>Confira sua conexão com a API e tente novamente.</p>
        </div>
        <button className="authSubmit" type="button" onClick={tentarNovamente}>
          Tentar novamente <span aria-hidden="true">↗</span>
        </button>
      </section>
    </main>
  );
}

function SessaoCarregando() {
  return (
    <main className="sessionLoading" role="status">
      <span className="loadingSpinner" aria-hidden="true" />
      <span>Restaurando sua sessão...</span>
    </main>
  );
}

function RotaProtegida({ children, admin = false }) {
  const { usuario } = useAuth();
  const {
    autenticado,
    carregandoSessao,
    erroRestauracao,
    tentarRestaurarSessao,
  } = useAuth();
  const location = useLocation();
  if (carregandoSessao) return <SessaoCarregando />;
  if (erroRestauracao) {
    return <SessaoTemporariamenteIndisponivel tentarNovamente={tentarRestaurarSessao} />;
  }
  if (!autenticado || !usuario?._id) return <Navigate to="/login" replace state={{ from: location }} />;
  if (admin && usuario?.perfil !== "admin") return <Navigate to="/trilhas" replace />;
  return children;
}

function App() {
  const { pathname } = useLocation();
  const { usuario, autenticado, carregandoSessao, erroRestauracao } = useAuth();
  const usuarioId = usuario?._id;
  const esconderMenu = !autenticado || carregandoSessao || ["/login", "/cadastro", "/termos", "/privacidade"].includes(pathname);

  useEffect(() => {
    if (carregandoSessao || erroRestauracao) return;
    if (usuarioId) obterCenarioFeed(usuarioId);
    else encerrarSessaoCenarioFeed();
  }, [usuarioId, carregandoSessao, erroRestauracao]);

  return (
    <div className={esconderMenu ? "appFrame authFrameOnly" : "appFrame"}>
      {!esconderMenu ? <Sidebar /> : null}

      <Routes>
        <Route path='/' element={<RotaProtegida><Home /></RotaProtegida>} />
        <Route path='/trilhas' element={<RotaProtegida><ListaTrilhas /></RotaProtegida>} />
        <Route path='/trilhas/nova' element={<RotaProtegida><CadastroTrilha /></RotaProtegida>} />
        <Route path='/trilhas/:id/editar' element={<RotaProtegida><EditarTrilha /></RotaProtegida>} />
        <Route path='/perfil' element={<RotaProtegida><Perfil /></RotaProtegida>} />
        <Route path='/ajuda' element={<RotaProtegida><Ajuda /></RotaProtegida>} />
        <Route path='/termos' element={<DocumentoLegal tipo="termos" />} />
        <Route path='/privacidade' element={<DocumentoLegal tipo="privacidade" />} />
        <Route path='/medalhas' element={<RotaProtegida><GuiaMedalhas /></RotaProtegida>} />
        <Route path='/admin' element={<RotaProtegida admin><Admin /></RotaProtegida>} />
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
        <Route path='*' element={<RotaProtegida><Navigate to="/trilhas" replace /></RotaProtegida>} />
      </Routes>
    </div>
  );
}

export default App;
