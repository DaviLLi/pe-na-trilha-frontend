import { useAuth } from "../contexts/useAuth";
import { obterPermissoesTrilha } from "../services/trilhaPermissoes.js";
import axios from "axios";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PostTrilha from "../components/PostTrilha";
import { obterMensagemErro } from "../services/api";
import {
  excluirTrilha,
  listarTrilhas,
} from "../services/trilhasService";

function ListaTrilhas() {
  const { usuario } = useAuth();
  const introducao = useRef(null);
  const pagina = useRef(null);
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
  const [idExcluindo, setIdExcluindo] = useState("");
  const [busca, setBusca] = useState("");

  const trilhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return trilhas;

    return trilhas.filter((trilha) =>
      [trilha.titulo, trilha.descricao, trilha.endereco]
        .filter(Boolean)
        .some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo)),
    );
  }, [busca, trilhas]);

  useEffect(() => {
    const controller = new AbortController();

    async function carregarTrilhas() {
      setCarregando(true);
      try {
        const dados = await listarTrilhas({ signal: controller.signal });
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

    carregarTrilhas();

    return () => controller.abort();
  }, [versao]);

  useEffect(() => {
    const atualizar = () => { if (document.visibilityState === "visible") setVersao((atual) => atual + 1); };
    window.addEventListener("publicacoes:atualizadas", atualizar);window.addEventListener("focus", atualizar);document.addEventListener("visibilitychange", atualizar);
    return () => { window.removeEventListener("publicacoes:atualizadas", atualizar);window.removeEventListener("focus", atualizar);document.removeEventListener("visibilitychange", atualizar); };
  }, []);

  const handleExcluir = async (trilha) => {
    if (!obterPermissoesTrilha(trilha, usuario).excluir) return;
    const confirmou = window.confirm(
      `Excluir permanentemente a publicação "${trilha.titulo}"? Esta ação não pode ser desfeita.`,
    );

    if (!confirmou) return;

    try {
      setIdExcluindo(trilha._id);
      await excluirTrilha(trilha._id);
      setTrilhas((estadoAtual) =>
        estadoAtual.filter((item) => item._id !== trilha._id),
      );
      setErro("");
    } catch (erroRequisicao) {
      setErro(obterMensagemErro(erroRequisicao));
    } finally {
      setIdExcluindo("");
      setVersao((atual) => atual + 1);
    }
  };

  return (
    <main className='layout feedPage' ref={pagina}>
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
              aria-label='Buscar trilhas por título, descrição ou endereço'
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

        {!carregando && trilhas.length === 0 ? (
          <div className='emptyFeed'>
            <strong>Nenhuma trilha cadastrada ainda.</strong>
            <span>Cadastre a primeira trilha para iniciar a lista.</span>
          </div>
        ) : null}

        {!carregando && trilhas.length > 0 && trilhasFiltradas.length === 0 ? (
          <div className='emptyFeed'>
            <strong>Nenhum resultado para “{busca}”.</strong>
            <span>Tente buscar por outro nome ou local.</span>
          </div>
        ) : null}

        {trilhasFiltradas.map((trilha) => (
          <PostTrilha
            key={trilha._id}
            trilha={trilha}
            excluindo={idExcluindo === trilha._id}
            onDelete={() => handleExcluir(trilha)}
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
