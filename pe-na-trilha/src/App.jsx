import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import About from "./components/About";
import Presentation from "./components/Presentation";
import Home from "./pages/Home";
import ListaTrilhas from "./pages/ListaTrilhas";
import CadastroTrilha from "./pages/CadastroTrilha";
import EditarTrilha from "./pages/EditarTrilha";
import "./styles/style.css";

function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/trilhas' element={<ListaTrilhas />} />
        <Route path='/trilhas/nova' element={<CadastroTrilha />} />
        <Route path='/trilhas/:id/editar' element={<EditarTrilha />} />
        <Route path='/sobre' element={<About />} />
        <Route path='/sprint-3' element={<Presentation />} />
        <Route path='*' element={<Home />} />
      </Routes>
    </>
  );
}

export default App;
