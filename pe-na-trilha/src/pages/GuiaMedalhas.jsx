import Medalha from "../components/Medalha";

const niveis = [
  { nivel: "Transparente", titulo: "Iniciante", faixa: "0 trilhas aprovadas", medalha: "transparente" },
  { nivel: "Verde", titulo: "Explorador", faixa: "1 a 15 trilhas aprovadas", medalha: "verde" },
  { nivel: "Bronze", titulo: "Aventureiro", faixa: "16 a 30 trilhas aprovadas", medalha: "bronze" },
  { nivel: "Prata", titulo: "Desbravador", faixa: "31 a 49 trilhas aprovadas", medalha: "prata" },
  { nivel: "Ouro", titulo: "Mestre das Trilhas", faixa: "50 ou mais trilhas aprovadas", medalha: "ouro" },
];

function GuiaMedalhas() {
  return (
    <main className="productMain medalPage">
      <header className="productPageHeading"><span className="pageEyebrow">Sua jornada</span><h1>Guia de Medalhas</h1><p>Os níveis acompanham suas trilhas aprovadas.</p></header>
      <ol className="medalLevels">
        {niveis.map(({ nivel, titulo, faixa, medalha }, index) => (
          <li className="medalLevel" key={nivel}>
            <Medalha nivel={medalha} className="medalArtwork" />
            <span className="medalLevelNumber">Nível {index + 1}</span>
            <h2>{nivel}</h2>
            {titulo ? <strong>{titulo}</strong> : null}
            <p>{faixa}</p>
          </li>
        ))}
      </ol>
      <p className="integrationNote">A API ainda não fornece a contagem de trilhas aprovadas. O nível individual será exibido quando essa informação estiver disponível.</p>
    </main>
  );
}

export default GuiaMedalhas;
