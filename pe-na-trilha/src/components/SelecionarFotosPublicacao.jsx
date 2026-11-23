import { useCallback, useId, useState } from "react";
import { validarFotosPublicacao } from "../services/publicacaoValidation.js";

function MiniaturaSelecionada({ arquivo, indice, capa, desabilitado, remover }) {
  const [falhou, setFalhou] = useState(false);
  // O callback permanece estável em renderizações com o mesmo File. React 19
  // executa sua limpeza ao retirar a imagem, inclusive em StrictMode.
  const associarImagem = useCallback((elemento) => {
    if (!elemento) return;
    const url = URL.createObjectURL(arquivo);
    elemento.src = url;
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);
  return <figure className="selectedPhoto">
    {!falhou ? <img ref={associarImagem} alt={`Prévia de ${arquivo.name}`} onError={() => setFalhou(true)} /> : <span className="selectedPhotoFallback">Prévia indisponível</span>}
    <span className="selectedPhotoPosition">{capa && indice === 0 ? "Capa" : `Foto ${indice + 1}`}</span>
    <button className="removeSelectedPhoto" type="button" disabled={desabilitado} aria-label={`Remover ${arquivo.name}`} onClick={remover}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M6 18 18 6" /></svg>
    </button>
    <figcaption title={arquivo.name}>{arquivo.name}</figcaption>
  </figure>;
}

export default function SelecionarFotosPublicacao({ fotos, aoAlterar, desabilitado = false, erro, aoErro, maximo = 5, id, rotulo = "Fotos da publicação" }) {
  const gerado = useId();
  const inputId = id || `fotos-${gerado}`;
  const limite = fotos.length >= maximo;
  return <section className="publicationPhotos" aria-label={rotulo}>
    <div className="photoPickerHeading"><h3>{rotulo}</h3><span>{fotos.length} / {maximo}</span></div>
    <div className={`photoPickerControl${limite ? " photoPickerFull" : ""}`}>
      <input className="photoPickerInput" id={inputId} aria-label={rotulo} type="file" multiple={maximo > 1} accept="image/jpeg,image/png,image/webp" disabled={desabilitado || limite} aria-describedby={`${inputId}-ajuda${erro ? ` ${inputId}-erro` : ""}`} onChange={(evento) => {
        const novos = Array.from(evento.target.files || []);
        evento.target.value = "";
        if (!novos.length || desabilitado) return;
        const falha = validarFotosPublicacao(novos);
        if (falha) { aoErro(falha); return; }
        if (fotos.length + novos.length > maximo) {
          aoErro(`Selecione até ${maximo === 5 ? "cinco" : maximo} foto(s) no total. Você pode adicionar mais ${Math.max(0, maximo - fotos.length)}.`);
          return;
        }
        aoErro(""); aoAlterar([...fotos, ...novos]);
      }} />
      <label htmlFor={inputId} aria-disabled={desabilitado || limite}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" /></svg>
        <strong>{limite ? "Limite de fotos atingido" : fotos.length ? "Adicionar mais fotos" : "Selecionar fotos"}</strong>
        <span>JPEG, PNG ou WebP · até 5 MiB cada</span>
      </label>
    </div>
    <p id={`${inputId}-ajuda`} className="photoPickerHelp">{maximo > 1 ? "Adicione em etapas, sem perder as fotos já selecionadas. A primeira será a capa." : "Selecione uma foto para enviar. Você pode removê-la antes de confirmar."}</p>
    {fotos.length ? <div className="selectedPhotosGrid">{fotos.map((arquivo, indice) => <MiniaturaSelecionada key={`${arquivo.name}:${arquivo.size}:${arquivo.lastModified}:${indice}`} arquivo={arquivo} indice={indice} capa={maximo > 1} desabilitado={desabilitado} remover={() => {
      aoErro(""); aoAlterar(fotos.filter((_, atual) => atual !== indice));
    }} />)}</div> : null}
    {limite ? <p className="photoPickerLimit" role="status">{maximo === 5 ? "Cinco fotos selecionadas. Remova uma para adicionar outra." : "Uma foto selecionada. Remova-a para escolher outra."}</p> : null}
    {erro ? <p className="fieldError" id={`${inputId}-erro`} role="alert">{erro}</p> : null}
  </section>;
}
