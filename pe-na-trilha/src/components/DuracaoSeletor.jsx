import { ajustarDuracao, duracaoValida } from "../services/publicacaoValidation.js";

export default function DuracaoSeletor({ valor, aoAlterar, desabilitado = false, erro }) {
  const mensagemErro = erro || (!duracaoValida(valor) ? "Escolha um tempo maior que zero ou limpe a duração." : "");
  return (
    <fieldset className="durationPicker" disabled={desabilitado} aria-describedby={mensagemErro ? "erro-duracao" : "ajuda-duracao"}>
      <legend>Tempo estimado <span className="optionalMark">Opcional</span></legend>
      <p id="ajuda-duracao">Ajuste o tempo do percurso ou deixe sem preenchimento.</p>
      <div className="durationControls">
        {[["horas", "Horas", 23], ["minutos", "Minutos", 59]].map(([unidade, rotulo, limite]) => (
          <div className="durationUnit" role="group" aria-label={rotulo} key={unidade}>
            <span className="durationUnitLabel">{rotulo}</span>
            <div className="durationStepper">
              <button type="button" aria-label={`Diminuir ${rotulo.toLowerCase()}`} disabled={!valor || valor[unidade] === 0} onClick={() => aoAlterar(ajustarDuracao(valor, unidade, -1))}>−</button>
              <output aria-label={rotulo} aria-live="polite">{valor === null ? "—" : String(valor[unidade]).padStart(2, "0")}</output>
              <button id={unidade === "horas" ? "duracao" : undefined} type="button" aria-label={`Aumentar ${rotulo.toLowerCase()}`} disabled={valor?.[unidade] === limite} onClick={() => aoAlterar(ajustarDuracao(valor, unidade, 1))}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="durationFooter">
        <span role="status">{valor === null ? "Duração não informada" : `${valor.horas} h e ${valor.minutos} min`}</span>
        <button className="clearAnswer" type="button" disabled={valor === null} onClick={() => aoAlterar(null)}>Limpar duração</button>
      </div>
      {mensagemErro ? <p className="fieldError" id="erro-duracao" role="alert">{mensagemErro}</p> : null}
    </fieldset>
  );
}
