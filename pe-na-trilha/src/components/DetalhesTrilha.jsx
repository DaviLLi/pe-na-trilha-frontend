import { formatarDuracao } from "../services/publicacaoValidation.js";
import { obterDetalhesTrilha, rotulosDetalhesTrilha } from "../data/detalhesTrilha.js";

function RelogioIcone() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  );
}

function DetalhesTrilha({ trilha }) {
  const detalhes = obterDetalhesTrilha(trilha);
  const duracao = formatarDuracao(trilha?.duracao);
  if (detalhes.length === 0 && !duracao) return null;

  return (
    <div className="trailMetadata" aria-label="Características do local">
      {detalhes.length ? (
        <ul className="trailTagList">
          {detalhes.map(({ chave, valor }) => (
            <li className="trailDetailChip" key={chave}>
              <span>{rotulosDetalhesTrilha[chave]}</span>{valor}
            </li>
          ))}
        </ul>
      ) : null}
      {duracao ? <p className="trailDuration"><RelogioIcone /> <span>Tempo estimado</span><strong>{duracao}</strong></p> : null}
    </div>
  );
}

export default DetalhesTrilha;
