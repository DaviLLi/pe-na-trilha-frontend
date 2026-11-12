const nomeUsuarioValido = /^\p{L}[\p{L}\p{M}]*$/u;
const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const senhaComMaiuscula = /\p{Lu}/u;
const senhaComMinuscula = /\p{Ll}/u;
const senhaComNumero = /\p{N}/u;
const senhaComEspecial = /[\p{P}\p{S}]/u;

export function validarNomeUsuario(nomeUsuario) {
  const normalizado = nomeUsuario.trim().normalize("NFC");
  return normalizado.length > 0 && nomeUsuarioValido.test(normalizado);
}

export function validarSenha(senha) {
  const tamanhoCaracteres = [...senha].length;
  const tamanhoBytes = new TextEncoder().encode(senha).length;

  return (
    tamanhoCaracteres >= 8 &&
    tamanhoBytes <= 72 &&
    senhaComMaiuscula.test(senha) &&
    senhaComMinuscula.test(senha) &&
    senhaComNumero.test(senha) &&
    senhaComEspecial.test(senha)
  );
}

export function validarCadastro({ nomeCompleto, nomeUsuario, email, senha, aceiteTermos }) {
  const erros = {};

  if (!nomeCompleto.trim()) {
    erros.nomeCompleto = "Informe seu nome completo.";
  }
  if (!validarNomeUsuario(nomeUsuario)) {
    erros.nomeUsuario = "Use somente letras no nome de usuário.";
  }
  if (!emailValido.test(email.trim())) {
    erros.email = "Informe um e-mail válido.";
  }
  if (!validarSenha(senha)) {
    erros.senha =
      "Use 8 ou mais caracteres, com maiúscula, minúscula, número e símbolo, respeitando o limite de 72 bytes.";
  }

  if (aceiteTermos !== true) {
    erros.aceiteTermos = "Leia e aceite os Termos de Uso para criar sua conta.";
  }

  return erros;
}
