// useEffect e useState são hooks usados para efeitos e estados do componente.
import { useEffect, useState } from "react";

// Componentes visuais da aplicação.
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Modal from "./components/Modal";
import PostTrilha from "./components/PostTrilha";
import About from "./components/About";
import Presentation from "./components/Presentation";
import { carregarPosts, salvarPosts } from "./services/postsStorage";

// Estilo principal da aplicação.
import "./styles/style.css";

// Componente principal da aplicação.
// Ele junta header, sidebar, feed e modal.
function App() {
  const [dadosIniciais] = useState(() => carregarPosts());

  // Estado que controla a página exibida no mini aplicativo.
  const [paginaAtual, setPaginaAtual] = useState("trilhas");

  // Estado que controla se o modal está aberto ou fechado.
  const [modalAberto, setModalAberto] = useState(false);

  // Estado que guarda a lista de posts publicados.
  const [posts, setPosts] = useState(dadosIniciais.posts);

  // Estado usado para avisar problemas de persistência ao usuário.
  const [erroStorage, setErroStorage] = useState(dadosIniciais.erro);

  // Toda alteração na lista é persistida no localStorage.
  useEffect(() => {
    setErroStorage(salvarPosts(posts));
  }, [posts]);

  const navegarPara = (pagina) => {
    setPaginaAtual(pagina);
    setModalAberto(false);
  };

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

  const renderizarPagina = () => {
    if (paginaAtual === "sobre") {
      return <About />;
    }

    if (paginaAtual === "sprint") {
      return <Presentation />;
    }

    return (
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
          {erroStorage ? (
            <div className='storageAlert' role='alert'>
              {erroStorage}
            </div>
          ) : null}

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
    );
  };

  return (
    <>
      {/* Componente do topo da página */}
      <Header paginaAtual={paginaAtual} aoNavegar={navegarPara} />

      {renderizarPagina()}

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
