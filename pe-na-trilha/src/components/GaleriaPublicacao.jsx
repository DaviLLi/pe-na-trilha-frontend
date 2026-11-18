import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useImagemPublicacao } from "../contexts/useImagemPublicacao.js";

function ImagemAmpliada({ foto, contexto, titulo }) {
  const publica = contexto === "publico";
  const permitida = publica || foto?.url?.startsWith?.("/trilhas/minhas/");
  const imagem = useImagemPublicacao(permitida ? foto : null, { contexto: publica ? "publico" : "privado" });
  return <div className="galleryImage" aria-busy={imagem.estado === "carregando"}>
    {imagem.url ? <img src={imagem.url} alt={`Foto ampliada de ${titulo}`} draggable="false" onError={imagem.aoFalhar} /> : null}
    {imagem.estado === "erro" ? <p role="status">{imagem.mensagem}</p> : imagem.estado === "carregando" ? <p className="galleryLoading" role="status">Carregando foto...</p> : null}
  </div>;
}

export default function GaleriaPublicacao({ fotos, titulo, contexto, inicial = 0, aoFechar }) {
  const [indice, setIndice] = useState(() => Math.max(0, Math.min(inicial, fotos.length - 1)));
  const dialogo = useRef(null), fechar = useRef(null), toque = useRef(null);
  useEffect(() => {
    const elemento = dialogo.current, anterior = document.activeElement, overflow = document.body.style.overflow;
    elemento.showModal();document.body.style.overflow = "hidden";fechar.current?.focus();
    return () => { elemento.close();document.body.style.overflow = overflow;if (anterior?.isConnected) anterior.focus(); };
  }, []);
  const mudar = (passo) => setIndice((atual) => Math.max(0, Math.min(fotos.length - 1, atual + passo)));
  return createPortal(<dialog className="publicationGallery" ref={dialogo} aria-label={`Fotos de ${titulo}`} onCancel={(evento) => { evento.preventDefault();aoFechar(); }} onKeyDown={(evento) => {
    evento.stopPropagation();
    if (evento.key === "ArrowRight") { evento.preventDefault();mudar(1); }
    if (evento.key === "ArrowLeft") { evento.preventDefault();mudar(-1); }
    if (evento.key === "Escape") { evento.preventDefault();aoFechar(); }
  }}>
    <header className="galleryHeader"><h2>{titulo}</h2><span aria-live="polite">{indice + 1} de {fotos.length}</span><button ref={fechar} type="button" aria-label="Fechar fotos" onClick={aoFechar}>×</button></header>
    <div className="galleryStage" onTouchStart={(evento) => { const t = evento.touches;toque.current = t.length === 1 ? { x: t[0].clientX, y: t[0].clientY } : null; }} onTouchCancel={() => { toque.current = null; }} onTouchEnd={(evento) => {
      const inicio = toque.current;toque.current = null;const fim = evento.changedTouches[0];
      if (!inicio || !fim || evento.touches.length) return;
      const x = fim.clientX - inicio.x, y = fim.clientY - inicio.y;
      if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y) * 1.3) mudar(x < 0 ? 1 : -1);
    }}>
      <ImagemAmpliada key={`${indice}:${fotos[indice]?._id}:${fotos[indice]?.updatedAt || ""}`} foto={fotos[indice]} contexto={contexto} titulo={titulo} />
    </div>
    <footer className="galleryNavigation"><button type="button" disabled={indice === 0} onClick={() => mudar(-1)}>← Anterior</button><span>Deslize ou use as setas para navegar</span><button type="button" disabled={indice === fotos.length - 1} onClick={() => mudar(1)}>Próxima →</button></footer>
  </dialog>, document.body);
}
