import { permissoesPublicacaoPropria } from "./publicacaoValidation.js";

// Reflete o contrato proprietario/status; metadados legados não concedem privilégios.
export function obterPermissoesTrilha(trilha, usuario) {
  const { editar, excluir } = permissoesPublicacaoPropria(trilha, usuario);
  return { editar, excluir };
}
