import { cadastrarUsuario } from "./authService.js";
import { validarCadastro } from "./authValidation.js";
import { VERSAO_TERMOS, VERSAO_PRIVACIDADE } from "../data/documentosLegais.js";

export async function concluirCadastro(campos, navegar) {
  const erros = validarCadastro(campos);
  if (Object.keys(erros).length) throw new Error(Object.values(erros).join(" "));
  await cadastrarUsuario({
    nomeCompleto: campos.nomeCompleto.trim(),
    nomeUsuario: campos.nomeUsuario.trim(),
    email: campos.email.trim(),
    senha: campos.senha,
    aceiteTermos: true,
    versaoTermos: VERSAO_TERMOS,
    versaoPoliticaPrivacidade: VERSAO_PRIVACIDADE,
  });
  // Uma resposta de sucesso confirma a conta, não comprova a persistência do aceite.
  navegar("/login", {
    replace: true,
    state: { mensagem: "Cadastro concluído. Entre com sua nova conta." },
  });
}
