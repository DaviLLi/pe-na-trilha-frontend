// GET /trilhas/minhas é uma lista completa, sem paginação no contrato atual.
export function contarPublicacoesProprias(publicacoes, proprietario) {
  if (!Array.isArray(publicacoes) || typeof proprietario !== "string" || !proprietario) return null;
  const ids = new Set();
  for (const publicacao of publicacoes) {
    if (!publicacao || typeof publicacao._id !== "string" || !publicacao._id
      || ids.has(publicacao._id) || publicacao.proprietario !== proprietario) return null;
    ids.add(publicacao._id);
  }
  return {
    publicadas: publicacoes.length,
    aprovadas: publicacoes.filter((publicacao) => publicacao.status === "approved").length,
  };
}
