import GaleriaMedalhas from "../components/GaleriaMedalhas.jsx";
import Medalha from "../components/Medalha";

import { niveisMedalhas } from "../data/niveisMedalhas.js";

function GuiaMedalhas() {
  return (
    <main className="productMain medalPage">
      <header className="productPageHeading"><span className="pageEyebrow">Sua jornada</span><h1>Guia de Medalhas</h1><p>Os níveis acompanham suas trilhas aprovadas.</p></header>
      <ol className="medalLevels">
        {niveisMedalhas.map(({ nivel, titulo, faixa, medalha }, index) => (
          <li className="medalLevel" key={nivel}>
            <Medalha nivel={medalha} className="medalArtwork" />
            <span className="medalLevelNumber">Nível {index + 1}</span>
            <h2>{nivel}</h2>
            {titulo ? <strong>{titulo}</strong> : null}
            <p>{faixa}</p>
          </li>
        ))}
      </ol>
      <GaleriaMedalhas />
    </main>
  );
}

export default GuiaMedalhas;
