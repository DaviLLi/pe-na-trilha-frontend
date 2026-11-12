import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validarCadastro,
  validarNomeUsuario,
  validarSenha,
} from "../src/services/authValidation.js";

test("aceita nomes de usuário compostos somente por letras, inclusive acentuadas", () => {
  assert.equal(validarNomeUsuario("Ána"), true);
  assert.equal(validarNomeUsuario("Ana Maria"), false);
  assert.equal(validarNomeUsuario("ana2"), false);
  assert.equal(validarNomeUsuario("_ana"), false);
});

test("exige todos os grupos de caracteres da senha e até 72 bytes UTF-8", () => {
  assert.equal(validarSenha("Trilha123!"), true);
  assert.equal(validarSenha("trilha123!"), false);
  assert.equal(validarSenha("TRILHA123!"), false);
  assert.equal(validarSenha("TrilhaSenha!"), false);
  assert.equal(validarSenha("Aa1!"), false);
  assert.equal(validarSenha(`Aa1!${"b".repeat(68)}`), true);
  assert.equal(validarSenha(`Aa1!${"b".repeat(69)}`), false);
  assert.equal(validarSenha(`Aa1!${"á".repeat(36)}`), false);
});

test("valida todos os campos do cadastro antes da requisição", () => {
  assert.deepEqual(
    validarCadastro({
      nomeCompleto: "Ana da Silva",
      nomeUsuario: "Ana",
      email: "ana@example.com",
      senha: "Trilha123!",
    }),
    {},
  );

  const erros = validarCadastro({
    nomeCompleto: " ",
    nomeUsuario: "ana_1",
    email: "ana@",
    senha: "curta",
  });
  assert.deepEqual(Object.keys(erros).sort(), [
    "email",
    "nomeCompleto",
    "nomeUsuario",
    "senha",
  ]);
});
