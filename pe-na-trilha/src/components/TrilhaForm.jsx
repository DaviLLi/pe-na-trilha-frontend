import { useState } from "react";
import { Link } from "react-router-dom";

const camposVazios = {
  titulo: "",
  descricao: "",
  endereco: "",
};

function TrilhaForm({
  valoresIniciais = camposVazios,
  aoEnviar,
  enviando = false,
  textoBotao = "Salvar trilha",
}) {
  const [campos, setCampos] = useState(valoresIniciais);

  const handleChange = (evento) => {
    const { name, value } = evento.target;
    setCampos((estadoAtual) => ({ ...estadoAtual, [name]: value }));
  };

  const handleSubmit = (evento) => {
    evento.preventDefault();

    aoEnviar({
      titulo: campos.titulo.trim(),
      descricao: campos.descricao.trim(),
      endereco: campos.endereco.trim(),
    });
  };

  return (
    <form className='trilhaForm' onSubmit={handleSubmit}>
      <div className='formField'>
        <label htmlFor='titulo'>Título</label>
        <input
          id='titulo'
          name='titulo'
          type='text'
          placeholder='Ex: Trilha da Pedra Grande ao amanhecer'
          value={campos.titulo}
          required
          disabled={enviando}
          onChange={handleChange}
        />
      </div>

      <div className='formField'>
        <label htmlFor='descricao'>Descrição</label>
        <textarea
          id='descricao'
          name='descricao'
          placeholder='Conte como é a trilha e quais são suas principais características.'
          value={campos.descricao}
          required
          disabled={enviando}
          onChange={handleChange}
        />
      </div>

      <div className='formField'>
        <label htmlFor='endereco'>Endereço</label>
        <input
          id='endereco'
          name='endereco'
          type='text'
          placeholder='Ex: Estrada da Serra, Atibaia - SP'
          value={campos.endereco}
          required
          disabled={enviando}
          onChange={handleChange}
        />
      </div>

      <div className='modalButtons'>
        <button className='primaryButton' type='submit' disabled={enviando}>
          {enviando ? "Salvando..." : textoBotao}
        </button>
        <Link className='secondaryButton formLink' to='/trilhas'>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export default TrilhaForm;
