import { useEffect, useId, useRef } from "react";
import { AJUSTE_INICIAL_AVATAR, calcularRecorteAvatar, moverRecorteAvatar } from "../services/recorteAvatar.js";

export default function RecorteAvatar({ imagem, ajuste, aoAlterar, desabilitado }) {
  const canvas = useRef(null), arraste = useRef(null);
  const id = useId();
  useEffect(() => {
    const area = canvas.current, recorte = calcularRecorteAvatar(imagem.width, imagem.height, ajuste);
    area.width = area.height = Math.min(320, recorte.tamanho);
    area.getContext("2d").drawImage(imagem, recorte.x, recorte.y, recorte.lado, recorte.lado, 0, 0, area.width, area.height);
  }, [imagem, ajuste]);
  return <div className="avatarCropEditor">
    <div className="avatarCropFrame">
      <canvas className="avatarCropCanvas" ref={canvas} role="img" aria-label="Prévia circular do enquadramento" aria-describedby={`${id}-ajuda`} onPointerDown={(evento) => {
        if (desabilitado || !evento.isPrimary) return;
        arraste.current = { pointerId: evento.pointerId, x: evento.clientX, y: evento.clientY, ajuste };
        evento.currentTarget.setPointerCapture(evento.pointerId);
      }} onPointerMove={(evento) => {
        const inicio = arraste.current;
        if (!inicio || desabilitado || evento.pointerId !== inicio.pointerId) return;
        aoAlterar(moverRecorteAvatar(imagem, inicio.ajuste, evento.clientX - inicio.x, evento.clientY - inicio.y, evento.currentTarget.getBoundingClientRect().width));
      }} onPointerUp={() => { arraste.current = null; }} onPointerCancel={() => { arraste.current = null; }} onLostPointerCapture={() => { arraste.current = null; }} />
    </div>
    <p id={`${id}-ajuda`} className="avatarCropHelp">Arraste a imagem para centralizar o rosto ou use os controles abaixo.</p>
    <fieldset className="avatarCropControls" disabled={desabilitado}>
      <legend>Ajustar enquadramento</legend>
      <label htmlFor={`${id}-zoom`}><span>Zoom <output>{ajuste.zoom.toFixed(2)}×</output></span><input id={`${id}-zoom`} aria-label="Zoom da foto" type="range" min="1" max={Math.min(3, imagem.width, imagem.height)} step="0.01" value={ajuste.zoom} onChange={(evento) => aoAlterar({ ...ajuste, zoom: Number(evento.target.value) })} /></label>
      <label htmlFor={`${id}-horizontal`}><span>Posição horizontal</span><input id={`${id}-horizontal`} aria-label="Posição horizontal" type="range" min="-100" max="100" step="1" value={ajuste.x} onChange={(evento) => aoAlterar({ ...ajuste, x: Number(evento.target.value) })} /></label>
      <label htmlFor={`${id}-vertical`}><span>Posição vertical</span><input id={`${id}-vertical`} aria-label="Posição vertical" type="range" min="-100" max="100" step="1" value={ajuste.y} onChange={(evento) => aoAlterar({ ...ajuste, y: Number(evento.target.value) })} /></label>
      <button className="avatarCropReset" type="button" onClick={() => aoAlterar({ ...AJUSTE_INICIAL_AVATAR })}>Centralizar imagem</button>
    </fieldset>
  </div>;
}
