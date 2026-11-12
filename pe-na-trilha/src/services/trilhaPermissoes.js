// A interface respeita os dados recebidos; toda autorização deve ser repetida na API.
export function obterPermissoesTrilha(trilha, usuario) {
  if (!usuario?._id) return { editar: false, excluir: false };
  const autorId = trilha.autorId ?? trilha.autor?._id;
  const propria = typeof autorId === "string" && autorId === usuario._id;
  return {
    editar: typeof trilha.permissoes?.editar === "boolean" ? trilha.permissoes.editar : propria,
    excluir: typeof trilha.permissoes?.excluir === "boolean" ? trilha.permissoes.excluir : propria,
  };
}
