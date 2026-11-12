import { chavesRespostasTrilha } from "../data/detalhesTrilha.js";

export function alterarResposta(respostas, chave, valor) {
  return {
    ...respostas,
    [chave]: valor,
    ...(chave === "tipoLocal" ? { caracteristicaPrincipal: "" } : {}),
  };
}

export function ajustarDuracao(duracao, unidade, incremento) {
  if (!["horas", "minutos"].includes(unidade)) return duracao;
  const atual = duracao || { horas: 0, minutos: 0 };
  const limite = unidade === "horas" ? 23 : 59;
  return { ...atual, [unidade]: Math.min(limite, Math.max(0, atual[unidade] + incremento)) };
}

export function duracaoValida(duracao) {
  return duracao === null || (
    Number.isInteger(duracao?.horas) && duracao.horas >= 0 && duracao.horas <= 23 &&
    Number.isInteger(duracao?.minutos) && duracao.minutos >= 0 && duracao.minutos <= 59 &&
    duracao.horas + duracao.minutos > 0
  );
}

export function validarPublicacao(campos, duracao = null) {
  const erros = {};
  for (const [chave, rotulo] of [["titulo", "título"], ["descricao", "descrição"], ["endereco", "localização"]]) {
    if (!campos[chave]?.trim()) erros[chave] = `Informe ${rotulo}.`;
  }
  if (!duracaoValida(duracao)) erros.duracao = "Escolha um tempo maior que zero ou limpe a duração.";
  return erros;
}

export function prepararPublicacao(campos, respostas, duracao) {
  const dados = Object.fromEntries(["titulo", "descricao", "endereco"].map((chave) => [chave, campos[chave].trim()]));
  if (respostas) {
    for (const chave of chavesRespostasTrilha) {
      if (respostas[chave]) dados[chave] = respostas[chave];
    }
    dados.duracao = duracao;
  }
  return dados;
}

export function formatarDuracao(duracao) {
  if (typeof duracao === "string") return duracao.trim();
  if (!duracao || !duracaoValida(duracao)) return "";
  return [duracao.horas ? `${duracao.horas}h` : "", duracao.minutos ? `${duracao.minutos}min` : ""].filter(Boolean).join(" ");
}
