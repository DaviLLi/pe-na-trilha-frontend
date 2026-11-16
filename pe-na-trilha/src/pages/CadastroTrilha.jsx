import { useEffect, useRef, useState } from "react";
import ResultadoPublicacao from "../components/ResultadoPublicacao.jsx";
import SelecionarFotosPublicacao from "../components/SelecionarFotosPublicacao.jsx";
import TrilhaForm from "../components/TrilhaForm";
import { useAuth } from "../contexts/useAuth";
import { criarTrilha, adicionarFotoTrilha } from "../services/trilhasService.js";
import { obterMensagemErro } from "../services/api.js";
import { validarFotosPublicacao } from "../services/publicacaoValidation.js";

function mensagemApi(erro) {
  const dados = erro.response?.data;
  const detalhes = Array.isArray(dados?.erros) ? dados.erros.filter((item) => typeof item === "string") : [];
  return [obterMensagemErro(erro), ...detalhes].join(" ");
}

function FormularioCadastro() {
  const [fotos, setFotos] = useState([]);
  const [erro, setErro] = useState("");
  const [erroFotos, setErroFotos] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [envios, setEnvios] = useState([]);
  const ativo = useRef(false);
  const ocupado = useRef(false);
  const controle = useRef(null);

  useEffect(() => {
    ativo.current = true;
    return () => { ativo.current = false; controle.current?.abort(); };
  }, []);

  async function cadastrar(dados) {
    if (ocupado.current || resultado) return;
    const falhaFotos = validarFotosPublicacao(fotos);
    if (falhaFotos) { setErroFotos(falhaFotos); return; }
    if (erroFotos) return;
    ocupado.current = true;
    setEnviando(true);
    setErro("");
    const controller = new AbortController();
    controle.current = controller;
    const atual = () => ativo.current && !controller.signal.aborted;
    let criada = false;
    try {
      const publicacao = await criarTrilha(dados, { signal: controller.signal });
      if (!atual()) return;
      if (!/^[a-f0-9]{24}$/i.test(publicacao?._id || "") || publicacao.status !== "pending") {
        setResultado("incerto");
        setErro("A API não confirmou o cadastro pendente esperado. Consulte suas publicações antes de tentar novamente.");
        return;
      }
      criada = true;
      setResultado("criada");
      const progresso = fotos.map((foto) => ({ nome: foto.name, estado: "Aguardando envio" }));
      setEnvios([...progresso]);
      for (let indice = 0; indice < fotos.length; indice += 1) {
        if (!atual()) return;
        progresso[indice] = { ...progresso[indice], estado: "Enviando" };
        setEnvios([...progresso]);
        try {
          await adicionarFotoTrilha(publicacao._id, fotos[indice], { signal: controller.signal });
          if (!atual()) return;
          progresso[indice] = { ...progresso[indice], estado: "Envio confirmado" };
          setEnvios([...progresso]);
        } catch (falha) {
          if (!atual()) return;
          progresso[indice] = { ...progresso[indice], estado: "Envio não confirmado" };
          for (let restante = indice + 1; restante < progresso.length; restante += 1) {
            progresso[restante] = { ...progresso[restante], estado: "Envio não iniciado" };
          }
          setEnvios([...progresso]);
          setErro(`${mensagemApi(falha)} A publicação foi criada e os envios anteriores foram preservados. Confira as fotos no Perfil antes de tentar novos envios.`);
          break;
        }
      }
    } catch (falha) {
      if (!atual()) return;
      setErro(mensagemApi(falha));
      // Sem confirmação, um POST pode ter persistido mesmo que sua resposta tenha se perdido.
      if (criada || !falha.response || falha.response.status >= 500) setResultado("incerto");
    } finally {
      if (atual()) { ocupado.current = false; setEnviando(false); }
    }
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
  const { usuario } = useAuth();
  return usuario?._id ? <FormularioCadastro key={usuario._id} /> : <main className="formPage"><p role="status">Entre na sua conta para cadastrar uma publicação.</p></main>;
}
