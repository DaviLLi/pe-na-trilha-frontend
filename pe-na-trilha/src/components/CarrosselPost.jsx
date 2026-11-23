import { useRef, useState } from "react";
import GaleriaPublicacao from "./GaleriaPublicacao.jsx";
import { useImagemPublicacao } from "../contexts/useImagemPublicacao.js";

function FotoAtiva({ foto, titulo, aoAbrir }) {
  const { ref, url, disponivel, estado, aoFalhar } = useImagemPublicacao(foto, { contexto: "publico", lazy: true });
  return <figure ref={ref} className="postPhoto" aria-busy={estado === "carregando"}>
    {url && estado === "pronta" ? <button className="photoOpenControl" type="button" aria-label={`Ampliar foto de ${titulo}`} onClick={aoAbrir}><span>Ampliar ↗</span></button> : null}
    {url ? <img src={url} alt={`Paisagem da trilha ${titulo}`} loading="lazy" draggable="false" onError={aoFalhar} /> : null}
    {!disponivel ? <figcaption className="postPhotoStatus">Foto indisponível</figcaption> : estado !== "pronta" ? <figcaption className="postPhotoStatus" role="status">{estado === "erro" ? "Não foi possível carregar a foto." : "Carregando foto..."}</figcaption> : null}
  </figure>;
}
function Vizinha({ foto, lado, selecionar }) {
  const { ref, url, estado, aoFalhar } = useImagemPublicacao(foto, { contexto: "publico", variante: "miniatura", lazy: true });
  return <button ref={ref} className={`carouselNeighbor carouselNeighbor-${lado}`} type="button" aria-label={lado === "anterior" ? "Ver foto anterior" : "Ver próxima foto"} onClick={selecionar} tabIndex={-1}>
    {url ? <img src={url} alt="" loading="lazy" draggable="false" onError={aoFalhar} /> : estado === "erro" ? <span>Foto indisponível</span> : null}
  </button>;
}
export default function CarrosselPost({ fotos, titulo }) {
  const [indice, setIndice] = useState(0);
  const inicio = useRef(null);
  const gesto = useRef(false);
  const [ampliada, setAmpliada] = useState(null);
  const atual = Math.min(indice, fotos.length - 1);
  const mudar = (passo) => setIndice((valor) => Math.max(0, Math.min(fotos.length - 1, Math.min(valor, fotos.length - 1) + passo)));
  if (!fotos.length) return <figure className="postPhoto postPhotoEmpty"><figcaption>Nenhuma foto cadastrada</figcaption></figure>;
  const foto = fotos[atual];
  return <section className="feedCarousel" aria-label={`Fotos de ${titulo}`} aria-roledescription="carrossel" tabIndex={0} onKeyDown={(e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault();mudar(e.key === "ArrowLeft" ? -1 : 1); }
  }}>
    <div className={`carouselStage${fotos.length === 1 ? " carouselSingle" : ""}`} onPointerDown={(e) => {
      if (!e.isPrimary || e.button !== 0) return;
      gesto.current = false;
      inicio.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      // O gesto horizontal não interfere na rolagem vertical do Feed.
    }} onPointerMove={(e) => {
      const i = inicio.current;if (!i || i.id !== e.pointerId) return;
      if (Math.abs(e.clientX - i.x) > 45 && Math.abs(e.clientX - i.x) > Math.abs(e.clientY - i.y) * 1.3) e.currentTarget.setPointerCapture(e.pointerId);
    }} onPointerLeave={(e) => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) inicio.current = null; }} onPointerUp={(e) => {
      const i = inicio.current;inicio.current = null;
      if (!i || i.id !== e.pointerId) return;
      const x = e.clientX - i.x, y = e.clientY - i.y;
      if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y) * 1.3) { gesto.current = true;e.preventDefault();mudar(x < 0 ? 1 : -1); }
    }} onPointerCancel={() => { inicio.current = null; }}>
      {atual > 0 ? <Vizinha key={`anterior:${fotos[atual - 1]._id}:${fotos[atual - 1].url}:${fotos[atual - 1].updatedAt || ""}`} foto={fotos[atual - 1]} lado="anterior" selecionar={() => mudar(-1)} /> : null}
      <FotoAtiva key={`${foto._id}:${foto.url}:${foto.updatedAt || ""}`} foto={foto} titulo={titulo} aoAbrir={() => { if (!gesto.current) setAmpliada(atual); }} />
      {atual < fotos.length - 1 ? <Vizinha key={`proxima:${fotos[atual + 1]._id}:${fotos[atual + 1].url}:${fotos[atual + 1].updatedAt || ""}`} foto={fotos[atual + 1]} lado="proxima" selecionar={() => mudar(1)} /> : null}
    </div>
    {ampliada !== null ? <GaleriaPublicacao fotos={fotos} titulo={titulo} contexto="publico" inicial={ampliada} aoFechar={() => setAmpliada(null)} /> : null}
    <div className="carouselControls">
      <button type="button" aria-label="Foto anterior" disabled={atual === 0} onClick={() => mudar(-1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m11 6-6 6 6 6M5 12h14" />
        </svg>
      </button>
      <span aria-live="polite">{atual + 1} de {fotos.length}</span>
      <button type="button" aria-label="Próxima foto" disabled={atual === fotos.length - 1} onClick={() => mudar(1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m13 6 6 6-6 6M5 12h14" />
        </svg>
      </button>
    </div>
  </section>;
}
