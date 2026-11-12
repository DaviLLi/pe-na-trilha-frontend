import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PostTrilha from "../components/PostTrilha";
import { obterMensagemErro } from "../services/api";
import {
  excluirTrilha,
  listarTrilhas,
} from "../services/trilhasService";

function ListaTrilhas() {
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
      try {
        const dados = await listarTrilhas({ signal: controller.signal });
        setTrilhas(dados);
        setErro("");
      } catch (erroRequisicao) {
        if (!axios.isCancel(erroRequisicao)) {
          setErro(obterMensagemErro(erroRequisicao));
        }
      } finally {
        setCarregando(false);
      }
    }

    carregarTrilhas();

    return () => controller.abort();
  }, []);

  const handleExcluir = async (trilha) => {
    const confirmou = window.confirm(
      `Deseja realmente excluir a trilha "${trilha.titulo}"?`,
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
    }
  };

  return (
    <main className='layout feedPage'>
      <section className='feed' aria-live='polite'>
        <div className='feedIntro'>
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
