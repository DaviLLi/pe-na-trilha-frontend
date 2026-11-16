import SelecionarFotosPublicacao from "./SelecionarFotosPublicacao.jsx";
import { useState } from "react";
import { adicionarFotoTrilha, substituirFotoTrilha, removerFotoTrilha } from "../services/trilhasService.js";
import { validarFotosPublicacao } from "../services/publicacaoValidation.js";
import { FotoPrivadaPerfil } from "./PublicacoesPerfil.jsx";

function SelecionarFoto({ rotulo, desabilitado, aoEnviar }) {
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState("");
  return <form className="ownerPhotoUpload" onSubmit={(evento) => {
    evento.preventDefault();
    if (desabilitado || erro) return;
    const falha = validarFotosPublicacao([arquivo]); setErro(falha);
    if (!falha) aoEnviar(arquivo);
  }}>
    <SelecionarFotosPublicacao fotos={arquivo ? [arquivo] : []} aoAlterar={(fotos) => setArquivo(fotos[0] || null)} maximo={1} rotulo={rotulo} desabilitado={desabilitado} erro={erro} aoErro={setErro} />
    <button className="secondaryButton" type="submit" disabled={desabilitado || !arquivo || Boolean(erro)}>{rotulo}</button>
  </form>;
}

export default function GerenciarFotosPublicacao({ publicacao, permitido, ocupado, executar, revisao }) {
  const fotos = publicacao.fotos || [];
  return <section className="ownerPhotoManager" aria-label="Gerenciar fotos">
    <h2>Fotos da publicação</h2>
    {!permitido ? <p>As fotos desta publicação não podem ser alteradas.</p> : <p>Até cinco fotos, JPEG, PNG ou WebP, até 5 MiB cada. A primeira foto é a capa.</p>}
    <div className="profilePostPhotos">{fotos.map((foto) => <div key={`${foto._id}:${revisao}`} className="ownerPhotoItem" data-foto-id={foto._id}>
      {typeof foto.url === "string" && foto.url.startsWith("/trilhas/minhas/") ? <FotoPrivadaPerfil url={foto.url} titulo={publicacao.titulo} /> : <p>Foto indisponível</p>}
      {permitido ? <>
        <SelecionarFoto rotulo="Substituir foto" desabilitado={ocupado} aoEnviar={(arquivo) => executar((config) => substituirFotoTrilha(publicacao._id, foto._id, arquivo, config), "Foto substituída.")} />
        <button className="ownerAction ownerDeleteButton" type="button" disabled={ocupado} onClick={() => {
          if (window.confirm("Remover esta foto da publicação?")) executar((config) => removerFotoTrilha(publicacao._id, foto._id, config), "Foto removida.");
        }}>Remover foto</button>
      </> : null}
    </div>)}</div>
    {permitido && fotos.length < 5 ? <SelecionarFoto key={revisao} rotulo="Adicionar foto" desabilitado={ocupado} aoEnviar={(arquivo) => executar((config) => adicionarFotoTrilha(publicacao._id, arquivo, config), "Foto adicionada.")} /> : null}
    {permitido && fotos.length >= 5 ? <p role="status">Limite de cinco fotos atingido.</p> : null}
  </section>;
}
