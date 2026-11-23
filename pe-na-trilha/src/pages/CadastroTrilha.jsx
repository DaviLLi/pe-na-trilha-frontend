import { useState, useSyncExternalStore } from "react";
import ResultadoPublicacao from "../components/ResultadoPublicacao.jsx";
import SelecionarFotosPublicacao from "../components/SelecionarFotosPublicacao.jsx";
import TrilhaForm from "../components/TrilhaForm";
import { useAuth } from "../contexts/useAuth";
import { cadastroInicial } from "../services/enviosPublicacao.js";
import { validarFotosPublicacao } from "../services/publicacaoValidation.js";

function FormularioCadastro({ fila }) {
  const [fotos, setFotos] = useState([]);
  const [erroFotos, setErroFotos] = useState("");
  const [envioAnterior] = useState(() => {
    const atual = fila.obterEstado();
    return atual.enviando ? null : atual.id;
  });
  const estado = useSyncExternalStore(fila.inscrever, fila.obterEstado);
  const { enviando, resultado, envios, erro } = estado.id === envioAnterior ? cadastroInicial : estado;

  function cadastrar(dados) {
    if (resultado) return;
    const falhaFotos = validarFotosPublicacao(fotos);
    if (falhaFotos) { setErroFotos(falhaFotos); return; }
    if (!erroFotos) void fila.cadastrar(dados, fotos);
  }

  return (
    <main className={`formPage newPostPage${resultado ? " publicationCompletePage" : ""}`}>
      <section className="formCard" aria-busy={enviando}>
        {!resultado ? <div className="modalHeader">
          <span className="pageEyebrow">Compartilhe com a comunidade</span>
          <h1>Nova publicação</h1>
          <p>Registre o percurso e suas características para orientar quem pretende visitá-lo.</p>
        </div> : null}
        {erro ? <p className="storageAlert" role="alert">{erro}</p> : null}
        {resultado ? (
          <ResultadoPublicacao resultado={resultado} envios={envios} enviando={enviando} />
        ) : (
          <TrilhaForm incluirDetalhes aoEnviar={cadastrar} enviando={enviando} textoBotao="Cadastrar publicação">
            <SelecionarFotosPublicacao fotos={fotos} aoAlterar={setFotos} desabilitado={enviando} erro={erroFotos} aoErro={setErroFotos} id="fotos-publicacao" />
          </TrilhaForm>
        )}
      </section>
      {!resultado ? <aside className="newPostAside">
        <span className="newPostAsideIcon" aria-hidden="true">⌁</span>
        <span className="pageEyebrow">Um bom registro</span>
        <h2>Informação clara faz diferença na trilha.</h2>
        <p>Preencha título, descrição e localização. As características e a duração são opcionais.</p>
        <div className="newPostFieldHint"><strong>Antes de aparecer no Feed</strong><span>A publicação será analisada pela administração.</span></div>
      </aside> : null}
    </main>
  );
}

export default function CadastroTrilha() {
  const { usuario, enviosPublicacao } = useAuth();
  return usuario?._id && enviosPublicacao ? <FormularioCadastro key={usuario._id} fila={enviosPublicacao} /> : <main className="formPage"><p role="status">Entre na sua conta para cadastrar uma publicação.</p></main>;
}
