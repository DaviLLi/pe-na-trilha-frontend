import { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Modal from "./components/Modal";
import PostTrilha from "./components/PostTrilha";
import "./styles/style.css";

function App() {
  const [modalAberto, setModalAberto] = useState(false);
  const [posts, setPosts] = useState([]);

  const handleCriarPost = (novoPost) => {
    setPosts((estadoAtual) => [
      {
        id: crypto.randomUUID(),
        autor: "Davi Martinelli",
        papel: "Trilheiro",
        avatar: "https://github.com/DaviLLi.png",
        ...novoPost,
      },
      ...estadoAtual,
    ]);

    setModalAberto(false);
  };

  const handleApagarPost = (postId) => {
    setPosts((estadoAtual) =>
      estadoAtual.filter((post) => post.id !== postId),
    );
  };

  return (
    <>
      <Header />

      <main className='layout'>
        <Sidebar
          postCount={posts.length}
          onNovoPost={() => setModalAberto(true)}
        />

        <section className='feed'>
          {posts.length === 0 ? (
            <div className='emptyFeed'>
              <strong>Nenhuma trilha publicada ainda.</strong>
              <span>Abra o modal e publique sua primeira experiência.</span>
            </div>
          ) : (
            posts.map((post) => (
              <PostTrilha
                key={post.id}
                post={post}
                onDelete={() => handleApagarPost(post.id)}
              />
            ))
          )}
        </section>
      </main>

      <Modal
        aberto={modalAberto}
        fechar={() => setModalAberto(false)}
        aoSalvar={handleCriarPost}
      />
    </>
  );
}

export default App;
