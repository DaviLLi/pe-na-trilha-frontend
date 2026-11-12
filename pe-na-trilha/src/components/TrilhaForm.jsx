import { useState } from "react";
import { Link } from "react-router-dom";
import { caracteristicasPorLocal, perguntasTrilha } from "../data/detalhesTrilha.js";

const camposVazios = { titulo: "", descricao: "", endereco: "" };
const respostasVazias = {
  tipoLocal: "",
  dificuldade: "",
  condicaoCaminho: "",
  sinalizacao: "",
  estacionamento: "",
  banheiro: "",
  alimentacao: "",
  estruturaBanho: "",
  acesso: "",
  caracteristicaPrincipal: "",
};

function TrilhaForm({
  valoresIniciais = camposVazios,
  aoEnviar,
  enviando = false,
  textoBotao = "Salvar trilha",
  incluirDetalhes = false,
  envioIndisponivel = false,
}) {
  const [campos, setCampos] = useState(() => ({ ...camposVazios, ...valoresIniciais }));
  const [respostas, setRespostas] = useState(respostasVazias);
  const [duracao, setDuracao] = useState("");

  const handleChange = (evento) => {
    const { name, value } = evento.target;
    setCampos((estadoAtual) => ({ ...estadoAtual, [name]: value }));
  };

  const handleRespostaChange = (chave, valor) => {
    setRespostas((estadoAtual) => ({
      ...estadoAtual,
      [chave]: valor,
      ...(chave === "tipoLocal" ? { caracteristicaPrincipal: "" } : {}),
    }));
  };

  const perguntas = incluirDetalhes
    ? [...perguntasTrilha, {
      chave: "caracteristicaPrincipal",
      titulo: "Característica principal",
      descricao: "O que mais se destaca neste local? As opções mudam conforme o tipo escolhido.",
      opcoes: caracteristicasPorLocal[respostas.tipoLocal] || caracteristicasPorLocal.Trilha,
    }]
    : [];

  const handleSubmit = (evento) => {
    evento.preventDefault();
    if (envioIndisponivel || !aoEnviar) return;
    aoEnviar({
      titulo: campos.titulo.trim(),
      descricao: campos.descricao.trim(),
      endereco: campos.endereco.trim(),
      ...(incluirDetalhes ? { ...respostas, duracao: duracao.trim() } : {}),
    });
  };

  return (
    <form className={`trilhaForm${incluirDetalhes ? " trailCreateForm" : ""}`} onSubmit={handleSubmit}>
      <div className="formField">
        <label htmlFor="titulo">Título <span className="requiredMark">Obrigatório</span></label>
        <input id="titulo" name="titulo" type="text" placeholder="Ex: Trilha da Pedra Grande ao amanhecer" aria-describedby="titulo-ajuda" value={campos.titulo} required autoComplete="off" disabled={enviando} onChange={handleChange} />
        <small id="titulo-ajuda">Dê um nome pelo qual outras pessoas reconheçam o percurso.</small>
      </div>

      <div className="formField">
        <label htmlFor="descricao">Descrição <span className="requiredMark">Obrigatória</span></label>
        <textarea id="descricao" name="descricao" placeholder="Conte como é a trilha e quais são suas principais características." aria-describedby="descricao-ajuda" value={campos.descricao} required rows={5} disabled={enviando} onChange={handleChange} />
        <small id="descricao-ajuda">Conte o que você sabe sobre a trilha de forma clara e direta.</small>
      </div>

      <div className="formField">
        <label htmlFor="endereco">Localização <span className="requiredMark">Obrigatória</span></label>
        <input id="endereco" name="endereco" type="text" placeholder="Ex: Estrada da Serra, Atibaia - SP" aria-describedby="endereco-ajuda" value={campos.endereco} required autoComplete="street-address" disabled={enviando} onChange={handleChange} />
        <small id="endereco-ajuda">Informe o endereço ou ponto de acesso ao percurso.</small>
      </div>

      {incluirDetalhes ? (
        <section className="trailDetailsSection" aria-labelledby="trail-details-title">
          <header className="trailDetailsHeading">
            <span className="pageEyebrow">Detalhes do percurso</span>
            <h2 id="trail-details-title">Conte como é o local</h2>
            <p>Escolha uma opção em cada pergunta. A característica principal acompanha o tipo de local.</p>
          </header>

          <div className="trailQuestionsGrid">
            {perguntas.map(({ chave, titulo, descricao, opcoes }, indice) => (
              <fieldset className="trailQuestion" key={chave}>
                <legend><span className="questionIndex">{String(indice + 1).padStart(2, "0")}</span>{titulo}</legend>
                <p>{descricao}</p>
                <div className="choiceChips">
                  {opcoes.map((opcao, opcaoIndice) => {
                    const id = `resposta-${chave}-${opcaoIndice}`;
                    const aguardandoTipo = chave === "caracteristicaPrincipal" && !respostas.tipoLocal;
                    return (
                      <label className="choiceChip" key={opcao} htmlFor={id}>
                        <input
                          id={id}
                          type="radio"
                          name={`resposta-${chave}`}
                          value={opcao}
                          checked={respostas[chave] === opcao}
                          required={opcaoIndice === 0}
                          disabled={enviando || aguardandoTipo}
                          onChange={() => handleRespostaChange(chave, opcao)}
                        />
                        <span>{opcao}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="formField durationField">
            <label htmlFor="duracao">Tempo estimado <span className="optionalMark">Opcional</span></label>
            <div className="durationInputWrap"><span aria-hidden="true">◷</span><input id="duracao" name="duracao" type="text" inputMode="text" placeholder="Ex: 1h30, 2 horas ou 3h30" value={duracao} disabled={enviando} onChange={(evento) => setDuracao(evento.target.value)} /></div>
            <small>Informe o tempo estimado para percorrer o local.</small>
          </div>
        </section>
      ) : null}

      <div className="modalButtons">
        {envioIndisponivel ? (
          <button className="primaryButton" type="button" disabled title="Aguardando suporte da API">Aguardando suporte da API</button>
        ) : (
          <button className="primaryButton" type="submit" disabled={enviando}>{enviando ? "Salvando..." : textoBotao}</button>
        )}
        <Link className="secondaryButton formLink" to="/trilhas">Cancelar</Link>
      </div>
    </form>
  );
}

export default TrilhaForm;
