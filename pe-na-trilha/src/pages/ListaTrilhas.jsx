import axios from "axios";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PostTrilha from "../components/PostTrilha";
import { useAuth } from "../contexts/useAuth";
import { obterMensagemErro } from "../services/api";
import { obterCenarioFeed } from "../services/cenariosFeed.js";
import {
  listarTrilhas,
} from "../services/trilhasService";
import "../styles/feedScenery.css";

function ListaTrilhas() {
  const { usuario } = useAuth();
  const usuarioId = usuario?._id;
  const introducao = useRef(null);
  const pagina = useRef(null);
  const imagemCenario = useRef(null);

  useEffect(() => {
    const url = obterCenarioFeed(usuarioId);
    if (url) imagemCenario.current.src = url;
  }, [usuarioId]);

  useLayoutEffect(() => {
    const intro = introducao.current;
    const atualizar = () => {
      const busca = intro.querySelector(".trailSearch");
      pagina.current?.style.setProperty("--guide-offset", `${busca.getBoundingClientRect().top - intro.getBoundingClientRect().top}px`);
    };
    atualizar();
    const observer = new ResizeObserver(atualizar);
    observer.observe(intro);
    return () => observer.disconnect();
  }, []);
  const [versao, setVersao] = useState(0);
  const [trilhas, setTrilhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function carregarTrilhas() {
      setCarregando(true);
      try {
        const dados = await listarTrilhas({ signal: controller.signal, params: busca.trim() ? { busca: busca.trim() } : undefined });
        if (!Array.isArray(dados)) throw new Error("Resposta de publicações inválida.");
        if (controller.signal.aborted) return;
        setTrilhas(dados);
        setErro("");
      } catch (erroRequisicao) {
        if (!controller.signal.aborted && !axios.isCancel(erroRequisicao)) {
          setErro(obterMensagemErro(erroRequisicao));
        }
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }

    setCarregando(true);
    const timer = setTimeout(carregarTrilhas, busca.trim() ? 300 : 0);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [versao, busca]);

  useEffect(() => {
    const atualizar = () => { if (document.visibilityState === "visible") setVersao((atual) => atual + 1); };
    window.addEventListener("publicacoes:atualizadas", atualizar);window.addEventListener("focus", atualizar);document.addEventListener("visibilitychange", atualizar);
    return () => { window.removeEventListener("publicacoes:atualizadas", atualizar);window.removeEventListener("focus", atualizar);document.removeEventListener("visibilitychange", atualizar); };
  }, []);

  return (
    <main className='layout feedPage' ref={pagina}>
      <div className="feedScenery" aria-hidden="true">
        <img ref={imagemCenario} alt="" decoding="async" fetchPriority="low" />
      </div>
      <section className='feed' aria-live='polite'>
        <div className='feedIntro' ref={introducao}>
          <div>
            <span className='feedEyebrow'>Explore ao ar livre</span>
            <h1>Encontre sua próxima trilha</h1>
            <p>Inspire-se com percursos compartilhados pela comunidade.</p>
          </div>
          <label className='trailSearch'>
            <span className='searchIcon' aria-hidden='true'>⌕</span>
            <input
              type='search'
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder='Buscar por trilha ou local'
              maxLength={100}
              aria-label='Buscar trilhas por título, descrição, local ou características'
            />
          </label>
        </div>

        <button className="profileRefreshButton" type="button" disabled={carregando} onClick={() => setVersao((atual) => atual + 1)}>Atualizar Feed</button>
        {erro ? (
          <div className='storageAlert' role='alert'>
            {erro}
          </div>
        ) : null}

        {carregando ? (
          <div className='emptyFeed'>
            <strong>Carregando trilhas...</strong>
          </div>
        ) : null}

        {!carregando && !erro && !busca.trim() && trilhas.length === 0 ? (
          <div className='emptyFeed'>
            <strong>Nenhuma trilha cadastrada ainda.</strong>
            <span>Cadastre a primeira trilha para iniciar a lista.</span>
          </div>
        ) : null}

        {!carregando && !erro && busca.trim() && trilhas.length === 0 ? (
          <div className='emptyFeed'>
            <strong>Nenhum resultado para “{busca}”.</strong>
            <span>Tente buscar por outro nome ou local.</span>
          </div>
        ) : null}

        {!carregando && !erro && trilhas.map((trilha) => (
          <PostTrilha
            key={trilha._id}
            trilha={trilha}
          />
        ))}
      </section>
      <aside className="feedAside">
        <section className="guideCard" aria-labelledby="guide-title">
          <span className="guideCardIcon" aria-hidden="true">✳</span>
          <div>
            <h2 id="guide-title">Guia de Medalhas</h2>
            <p>Conheça os níveis e critérios de progressão do Pé na Trilha.</p>
          </div>
          <Link to="/medalhas">Ver níveis <span aria-hidden="true">↗</span></Link>
        </section>
      </aside>
    </main>
  );
}

export default ListaTrilhas;
