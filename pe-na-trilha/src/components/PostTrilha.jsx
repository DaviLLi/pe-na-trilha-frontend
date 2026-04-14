import { useState } from "react";

function PostTrilha() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [endereco, setEndereco] = useState("");

  const handleSubmit = () => {
    alert(`Trilha cadastrada:\n${titulo}\n${descricao}\n${endereco}`);
  };

  return (
    <div>
      <h2>Cadastrar Trilha</h2>

      <input
        type='text'
        placeholder='Titulo'
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />

      <br />

      <input
        type='text'
        placeholder='Descrição'
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />

      <br />

      <input
        type='text'
        placeholder='Endereço'
        value={endereco}
        onChange={(e) => setEndereco(e.target.value)}
      />

      <br />

      <button onClick={handleSubmit}>Publicar</button>
    </div>
  );
}

export default PostTrilha;
