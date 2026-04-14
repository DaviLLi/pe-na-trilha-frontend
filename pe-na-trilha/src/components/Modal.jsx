// Hooks usados no componente:
// - useState: guarda o valor dos campos do formulário
// - useEffect: escuta eventos externos, como tecla ESC
import { useEffect, useState } from "react";

// Componente de modal para criar um novo post.
// Props:
// - aberto: define se o modal deve aparecer
// - fechar: função para fechar o modal
// - aoSalvar: função que recebe os dados do formulário
function Modal({ aberto, fechar, aoSalvar }) {
  // Estados dos campos do formulário controlado.
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState("");

  // Função auxiliar para limpar todos os campos.
  const limparFormulario = () => {
    setTitulo("");
    setDescricao("");
    setEndereco("");
  };

  // Evento usado para fechar o modal e limpar o formulário.
  const handleFechar = () => {
    limparFormulario();
    fechar();
  };

  // Effect usado para ouvir a tecla ESC enquanto o modal estiver aberto.
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

  // Se o modal não estiver aberto, não renderiza nada na tela.
  if (!aberto) return null;

  // Evento de submit do formulário.
  const handleSubmit = (e) => {
    // Impede o recarregamento padrão da página.
    e.preventDefault();

    // Validação simples para evitar campos vazios.
    if (!titulo.trim() || !descricao.trim() || !endereco.trim()) {
      return;
    }

    // Envia os dados para o componente pai.
    aoSalvar({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      endereco: endereco.trim(),
    });

    // Limpa o formulário após salvar.
    limparFormulario();
  };

  return (
    <>
      {/* Overlay escuro atrás do modal.
       */}
      <div
        className='modalOverlay'
        onClick={handleFechar}
        aria-hidden='true'
      ></div>

      {/* Caixa principal do modal */}
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

        {/* Formulário controlado:
            cada campo tem value + onChange ligado ao estado.
        */}
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

          {/* Botões de ação do modal */}
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
