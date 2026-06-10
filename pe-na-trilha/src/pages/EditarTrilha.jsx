import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TrilhaForm from "../components/TrilhaForm";
import { obterMensagemErro } from "../services/api";
import {
  atualizarTrilha,
  buscarTrilha,
} from "../services/trilhasService";

function EditarTrilha() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trilha, setTrilha] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarTrilha() {
      try {
        const dados = await buscarTrilha(id);
        setTrilha(dados);
      } catch (erroRequisicao) {
        setErro(obterMensagemErro(erroRequisicao));
      } finally {
        setCarregando(false);
      }
    }

    carregarTrilha();
  }, [id]);

  const handleSubmit = async (dados) => {
    try {
      setEnviando(true);
      setErro("");
      await atualizarTrilha(id, dados);
      navigate("/trilhas");
    } catch (erroRequisicao) {
      setErro(obterMensagemErro(erroRequisicao));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className='formPage'>
      <section className='formCard'>
        <div className='modalHeader'>
          <h1>Editar Trilha</h1>
          <p>Atualize os dados da trilha selecionada.</p>
        </div>

        {erro ? (
          <div className='storageAlert' role='alert'>
            {erro}
          </div>
        ) : null}

        {carregando ? <p className='loadingText'>Carregando trilha...</p> : null}

        {!carregando && trilha ? (
          <TrilhaForm
            valoresIniciais={{
              titulo: trilha.titulo,
              descricao: trilha.descricao,
              endereco: trilha.endereco,
            }}
            aoEnviar={handleSubmit}
            enviando={enviando}
            textoBotao='Atualizar trilha'
          />
        ) : null}
      </section>
    </main>
  );
}

export default EditarTrilha;
