export const niveisMedalhas = [
  { nivel: "Transparente", titulo: "Iniciante", minimo: 0, faixa: "0 trilhas aprovadas", medalha: "transparente" },
  { nivel: "Verde", titulo: "Explorador", minimo: 1, faixa: "1 a 15 trilhas aprovadas", medalha: "verde" },
  { nivel: "Bronze", titulo: "Aventureiro", minimo: 16, faixa: "16 a 30 trilhas aprovadas", medalha: "bronze" },
  { nivel: "Prata", titulo: "Desbravador", minimo: 31, faixa: "31 a 49 trilhas aprovadas", medalha: "prata" },
  { nivel: "Ouro", titulo: "Mestre das Trilhas", minimo: 50, faixa: "50 ou mais trilhas aprovadas", medalha: "ouro" },
];

export function calcularMedalha(quantidade) {
  if (!Number.isSafeInteger(quantidade) || quantidade < 0) return null;
  const indice = niveisMedalhas.findLastIndex(({ minimo }) => quantidade >= minimo);
  const atual = niveisMedalhas[indice];
  const proxima = niveisMedalhas[indice + 1] || null;
  return {
    atual, proxima, quantidade,
    faltam: proxima ? proxima.minimo - quantidade : 0,
    progresso: proxima ? Math.round(((quantidade - atual.minimo) / (proxima.minimo - atual.minimo)) * 100) : 100,
  };
}
