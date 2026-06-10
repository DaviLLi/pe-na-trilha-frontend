import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TrilhaForm from "../components/TrilhaForm";
import { obterMensagemErro } from "../services/api";
import { criarTrilha } from "../services/trilhasService";

function CadastroTrilha() {
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const handleSubmit = async (dados) => {
    try {
      setEnviando(true);
      setErro("");
      await criarTrilha(dados);
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
          <h1>Nova Trilha</h1>
          <p>Preencha os campos abaixo para cadastrar uma trilha.</p>
        </div>

        {erro ? (
          <div className='storageAlert' role='alert'>
            {erro}
          </div>
        ) : null}

        <TrilhaForm aoEnviar={handleSubmit} enviando={enviando} />
      </section>
    </main>
  );
}

export default CadastroTrilha;
