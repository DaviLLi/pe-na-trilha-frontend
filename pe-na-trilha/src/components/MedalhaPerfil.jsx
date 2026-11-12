import Medalha from "./Medalha";
import { calcularMedalha } from "../data/niveisMedalhas.js";

export default function MedalhaPerfil({ quantidadeAprovada, carregando = false }) {
  const conquista = calcularMedalha(quantidadeAprovada);
  return (
    <div className="profileInfoCard profileCurrentMedal">
      <span className="profileSectionLabel">Nível atual</span>
      {carregando || !conquista ? (
        <p className="profileUnavailable" role="status">{carregando ? "Carregando sua medalha…" : "Sua medalha aparecerá quando a contagem de trilhas aprovadas estiver disponível."}</p>
      ) : (
        <>
          <div className="profileMedalValue">
            <Medalha nivel={conquista.atual.medalha} width="64" height="64" />
            <div><strong>{conquista.atual.nivel}</strong><span>{conquista.atual.titulo}</span></div>
          </div>
          <p className="medalCount">{conquista.quantidade} {conquista.quantidade === 1 ? "trilha aprovada" : "trilhas aprovadas"}</p>
          {conquista.proxima ? (
            <div className="medalProgress">
              <label htmlFor="progresso-medalha">Rumo a {conquista.proxima.nivel}</label>
              <progress id="progresso-medalha" value={conquista.progresso} max="100" />
              <small>Faltam {conquista.faltam} {conquista.faltam === 1 ? "trilha aprovada" : "trilhas aprovadas"} para o próximo nível.</small>
            </div>
          ) : <p className="medalMax">Você alcançou o nível mais alto!</p>}
        </>
      )}
    </div>
  );
}
