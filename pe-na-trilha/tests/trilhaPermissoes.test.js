import assert from "node:assert/strict";
import { test } from "node:test";
import { obterPermissoesTrilha } from "../src/services/trilhaPermissoes.js";
const usuario = { _id: "u1" };
test("visitante e dados sem autoria não habilitam controles", () => {
  for (const trilha of [{ proprietario: "u1", status: "approved" }, { autorId: "u1", permissoes: { excluir: true } }, {}]) assert.deepEqual(obterPermissoesTrilha(trilha, null), { editar: false, excluir: false });
  assert.deepEqual(obterPermissoesTrilha({}, usuario), { editar: false, excluir: false });
  assert.deepEqual(obterPermissoesTrilha({ proprietario: "u2", status: "approved" }, usuario), { editar: false, excluir: false });
});
test("autoria e status do contrato concedem somente controles legítimos", () => {
  for (const status of ["pending", "approved", "rejected"]) assert.deepEqual(obterPermissoesTrilha({ proprietario: "u1", status }, usuario), { editar: true, excluir: true });
  assert.deepEqual(obterPermissoesTrilha({ proprietario: "u1" }, usuario), { editar: false, excluir: true });
  assert.deepEqual(obterPermissoesTrilha({ autorId: "u1", permissoes: { editar: true, excluir: true } }, usuario), { editar: false, excluir: false });
  assert.deepEqual(obterPermissoesTrilha({ proprietario: "u2", status: "approved", permissoes: { excluir: true } }, { ...usuario, perfil: "admin" }), { editar: false, excluir: false });
});
