// useState é o hook usado para criar e atualizar estados no componente.
import { useState } from "react";

// Componentes visuais da aplicação.
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Modal from "./components/Modal";
import PostTrilha from "./components/PostTrilha";

// Estilo principal da aplicação.
import "./styles/style.css";

// Componente principal da aplicação.
// Ele junta header, sidebar, feed e modal.
function App() {
  // Estado que controla se o modal está aberto ou fechado.
  const [modalAberto, setModalAberto] = useState(false);

  // Estado que guarda a lista de posts publicados.
  const [posts, setPosts] = useState([]);

  // Função/evento chamado quando o modal envia um novo post.
  // Aqui eu adiciono o novo post no início da lista e fecho o modal.
  const handleCriarPost = (novoPost) => {
    setPosts((estadoAtual) => [
      {
        // Gera um id único para cada post.
        id: crypto.randomUUID(),

        // Dados fixos do autor por enquanto.
        autor: "Davi Martinelli",
        papel: "Trilheiro",
        avatar: "https://github.com/DaviLLi.png",

        // Espalha os dados vindos do formulário.
        ...novoPost,
      },

      // Mantém os posts antigos depois do novo.
      ...estadoAtual,
    ]);

    // Fecha o modal depois de salvar.
    setModalAberto(false);
  };

  // Função/evento responsável por apagar um post do feed.
  const handleApagarPost = (postId) => {
    setPosts((estadoAtual) =>
      // filter cria uma nova lista sem o post que foi removido.
      estadoAtual.filter((post) => post.id !== postId),
    );
  };

  return (
    <>
      {/* Componente do topo da página */}
      <Header />

      <main className='layout'>
        {/* Sidebar recebe props:
            - postCount: quantidade atual de posts
            - onNovoPost: evento para abrir o modal
        */}
        <Sidebar
          postCount={posts.length}
          onNovoPost={() => setModalAberto(true)}
        />

        <section className='feed'>
          {/* Renderização condicional:
              se não houver posts, mostra mensagem vazia.
              se houver, percorre a lista e desenha um card para cada item.
          */}
          {posts.length === 0 ? (
            <div className='emptyFeed'>
              <strong>Nenhuma trilha publicada ainda.</strong>
              <span>Abra o modal e publique sua primeira experiência.</span>
            </div>
          ) : (
            posts.map((post) => (
              // Cada item da lista vira um componente PostTrilha.
              <PostTrilha
                key={post.id}
                post={post}
                onDelete={() => handleApagarPost(post.id)}
              />
            ))
          )}
        </section>
      </main>

      {/* Modal recebe:
          - aberto: controla exibição
          - fechar: evento para fechar
          - aoSalvar: evento chamado no envio do formulário
      */}
      <Modal
        aberto={modalAberto}
        fechar={() => setModalAberto(false)}
        aoSalvar={handleCriarPost}
      />
    </>
  );
}

export default App;
