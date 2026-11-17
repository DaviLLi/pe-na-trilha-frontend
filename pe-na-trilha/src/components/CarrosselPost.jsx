import { useRef, useState } from "react";
import { obterUrlImagemPublica } from "../services/imagensPublicacoesService.js";

function resolver(foto, variante) {
  try { return obterUrlImagemPublica(foto?.url, { variante }); } catch { return null; }
}
function FotoAtiva({ url, titulo }) {
  const [estado, setEstado] = useState("carregando");
  return <figure className="postPhoto" aria-busy={Boolean(url) && estado === "carregando"}>
    {url && estado !== "erro" ? <img src={url} alt={`Paisagem da trilha ${titulo}`} loading="lazy" draggable="false" onLoad={() => setEstado("pronta")} onError={() => setEstado("erro")} /> : null}
    {!url ? <figcaption className="postPhotoStatus">Foto indisponível</figcaption> : estado !== "pronta" ? <figcaption className="postPhotoStatus" role="status">{estado === "erro" ? "Não foi possível carregar a foto." : "Carregando foto..."}</figcaption> : null}
  </figure>;
}
function Vizinha({ foto, lado, selecionar }) {
  const url = resolver(foto, "miniatura");
  const [falhou, setFalhou] = useState(false);
  return <button className={`carouselNeighbor carouselNeighbor-${lado}`} type="button" aria-label={lado === "anterior" ? "Ver foto anterior" : "Ver próxima foto"} onClick={selecionar} tabIndex={-1}>
    {url && !falhou ? <img src={url} alt="" loading="lazy" draggable="false" onError={() => setFalhou(true)} /> : <span>Foto indisponível</span>}
  </button>;
}
export default function CarrosselPost({ fotos, titulo }) {
  const [indice, setIndice] = useState(0);
  const inicio = useRef(null);
  const atual = Math.min(indice, fotos.length - 1);
  const mudar = (passo) => setIndice((valor) => Math.max(0, Math.min(fotos.length - 1, Math.min(valor, fotos.length - 1) + passo)));
  if (!fotos.length) return <figure className="postPhoto postPhotoEmpty"><figcaption>Nenhuma foto cadastrada</figcaption></figure>;
  const foto = fotos[atual], url = resolver(foto, "detalhe");
  return <section className="feedCarousel" aria-label={`Fotos de ${titulo}`} aria-roledescription="carrossel" tabIndex={0} onKeyDown={(e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault();mudar(e.key === "ArrowLeft" ? -1 : 1); }
  }}>
    <div className={`carouselStage${fotos.length === 1 ? " carouselSingle" : ""}`} onPointerDown={(e) => {
      if (!e.isPrimary || e.button !== 0) return;
      inicio.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      // O gesto horizontal não interfere na rolagem vertical do Feed.
    }} onPointerMove={(e) => {
      const i = inicio.current;if (!i || i.id !== e.pointerId) return;
      if (Math.abs(e.clientX - i.x) > 45 && Math.abs(e.clientX - i.x) > Math.abs(e.clientY - i.y) * 1.3) e.currentTarget.setPointerCapture(e.pointerId);
    }} onPointerLeave={(e) => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) inicio.current = null; }} onPointerUp={(e) => {
      const i = inicio.current;inicio.current = null;
      if (!i || i.id !== e.pointerId) return;
      const x = e.clientX - i.x, y = e.clientY - i.y;
      if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y) * 1.3) { e.preventDefault();mudar(x < 0 ? 1 : -1); }
    }} onPointerCancel={() => { inicio.current = null; }}>
      {atual > 0 ? <Vizinha key={`anterior:${fotos[atual - 1]._id}:${fotos[atual - 1].url}:${fotos[atual - 1].updatedAt || ""}`} foto={fotos[atual - 1]} lado="anterior" selecionar={() => mudar(-1)} /> : null}
      <FotoAtiva key={`${foto._id}:${url}:${foto.updatedAt || ""}`} url={url} titulo={titulo} />
      {atual < fotos.length - 1 ? <Vizinha key={`proxima:${fotos[atual + 1]._id}:${fotos[atual + 1].url}:${fotos[atual + 1].updatedAt || ""}`} foto={fotos[atual + 1]} lado="proxima" selecionar={() => mudar(1)} /> : null}
    </div>
    <div className="carouselControls">
      <button type="button" aria-label="Foto anterior" disabled={atual === 0} onClick={() => mudar(-1)}>←</button>
      <span aria-live="polite">{atual + 1} de {fotos.length}</span>
      <button type="button" aria-label="Próxima foto" disabled={atual === fotos.length - 1} onClick={() => mudar(1)}>→</button>
    </div>
  </section>;
}
