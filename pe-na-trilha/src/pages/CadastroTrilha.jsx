import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
    setErroFotos(falhaFotos);
    if (falhaFotos) return;
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
    <main className="formPage newPostPage">
      <section className="formCard" aria-busy={enviando}>
        <div className="modalHeader">
          <span className="pageEyebrow">Compartilhe com a comunidade</span>
          <h1>Nova publicação</h1>
          <p>Registre o percurso e suas características para orientar quem pretende visitá-lo.</p>
        </div>
        {erro ? <p className="storageAlert" role="alert">{erro}</p> : null}
        {resultado ? (
          <section className="publicationResult" aria-label="Resultado do cadastro">
            <h2>{resultado === "criada" ? "Publicação cadastrada como pendente" : "Cadastro sem confirmação"}</h2>
            <p>{resultado === "criada" ? "Sua publicação aguarda análise administrativa. Acompanhe o estado atual no Perfil." : "Consulte suas publicações antes de tentar cadastrar novamente."}</p>
            {envios.length ? <ul aria-label="Envio das fotos">{envios.map((envio, indice) => <li key={indice}><span>{envio.nome}</span><strong>{envio.estado}</strong></li>)}</ul> : null}
            <p role="status">{enviando ? "Enviando fotos… Aguarde a conclusão." : `${envios.filter((envio) => envio.estado === "Envio confirmado").length} foto(s) com envio confirmado.`}</p>
            <Link className="secondaryButton formLink" to="/perfil">Ver minhas publicações</Link>
          </section>
        ) : (
          <TrilhaForm incluirDetalhes aoEnviar={cadastrar} enviando={enviando} textoBotao="Cadastrar publicação">
            <section className="publicationPhotos" aria-labelledby="publication-photos-title">
              <h2 id="publication-photos-title">Fotos <span className="optionalMark">Opcionais</span></h2>
              <label htmlFor="fotos-publicacao">Selecione até cinco fotos</label>
              <input id="fotos-publicacao" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={enviando} aria-describedby="fotos-ajuda" onChange={(evento) => {
                const arquivos = Array.from(evento.target.files || []);
                setFotos(arquivos);
                setErroFotos(validarFotosPublicacao(arquivos));
              }} />
              <small id="fotos-ajuda">JPEG, PNG ou WebP, até 5 MiB cada. Serão enviadas individualmente após o cadastro, na ordem selecionada. A primeira foto será a capa.</small>
              {fotos.length ? <ul>{fotos.map((foto, indice) => <li key={indice}>{foto.name}</li>)}</ul> : null}
              {erroFotos ? <p className="fieldError" role="alert">{erroFotos}</p> : null}
            </section>
          </TrilhaForm>
        )}
      </section>
      <aside className="newPostAside">
        <span className="newPostAsideIcon" aria-hidden="true">⌁</span>
        <span className="pageEyebrow">Um bom registro</span>
        <h2>Informação clara faz diferença na trilha.</h2>
        <p>Preencha título, descrição e localização. As características e a duração são opcionais.</p>
        <div className="newPostFieldHint"><strong>Antes de aparecer no Feed</strong><span>A publicação será analisada pela administração.</span></div>
      </aside>
    </main>
  );
}

export default function CadastroTrilha() {
  const { usuario } = useAuth();
  return usuario?._id ? <FormularioCadastro key={usuario._id} /> : <main className="formPage"><p role="status">Entre na sua conta para cadastrar uma publicação.</p></main>;
}
