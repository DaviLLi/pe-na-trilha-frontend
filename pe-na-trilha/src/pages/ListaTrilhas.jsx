import axios from "axios";
import { useEffect, useState } from "react";
import PostTrilha from "../components/PostTrilha";
import Sidebar from "../components/Sidebar";
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
    <main className='layout'>
      <Sidebar trilhaCount={trilhas.length} />

      <section className='feed' aria-live='polite'>
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

        {trilhas.map((trilha) => (
          <PostTrilha
            key={trilha._id}
            trilha={trilha}
            excluindo={idExcluindo === trilha._id}
            onDelete={() => handleExcluir(trilha)}
          />
        ))}
      </section>
    </main>
  );
}

export default ListaTrilhas;
