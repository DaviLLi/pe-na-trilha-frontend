import { useEffect, useState } from "react";

function Modal({ aberto, fechar, aoSalvar }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState("");

  const limparFormulario = () => {
    setTitulo("");
    setDescricao("");
    setEndereco("");
  };

  const handleFechar = () => {
    limparFormulario();
    fechar();
  };

  useEffect(() => {
    if (!aberto) return undefined;

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setTitulo("");
        setDescricao("");
        setEndereco("");
        fechar();
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => window.removeEventListener("keydown", handleEsc);
  }, [aberto, fechar]);

  if (!aberto) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!titulo.trim() || !descricao.trim() || !endereco.trim()) {
      return;
    }

    aoSalvar({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      endereco: endereco.trim(),
    });

    limparFormulario();
  };

  return (
    <>
      <div
        className='modalOverlay'
        onClick={handleFechar}
        aria-hidden='true'
      ></div>

      <div
        className='modal'
        role='dialog'
        aria-modal='true'
        aria-labelledby='new-post-title'
      >
        <div className='modalHeader'>
          <h2 id='new-post-title'>Novo Post</h2>
          <p>Preencha os campos abaixo para publicar uma nova experiência.</p>
        </div>

        <form id='postForm' onSubmit={handleSubmit}>
          <div className='formField'>
            <label htmlFor='titulo'>Título</label>
            <input
              id='titulo'
              name='titulo'
              type='text'
              placeholder='Ex: Trilha da Pedra Grande ao amanhecer'
              value={titulo}
              required
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className='formField'>
            <label htmlFor='descricao'>Descrição</label>
            <textarea
              id='descricao'
              name='descricao'
              placeholder='Conte como foi a trilha, o nível de dificuldade e o que vale a pena levar.'
              value={descricao}
              required
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className='formField'>
            <label htmlFor='endereco'>Endereço</label>
            <input
              id='endereco'
              name='endereco'
              type='text'
              placeholder='Ex: Estrada da Serra, Atibaia - SP'
              value={endereco}
              required
              onChange={(e) => setEndereco(e.target.value)}
            />
          </div>

          <div className='modalButtons'>
            <button className='primaryButton' type='submit'>
              Salvar
            </button>
            <button
              className='secondaryButton'
              type='button'
              onClick={handleFechar}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default Modal;
