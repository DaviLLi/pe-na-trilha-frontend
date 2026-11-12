import assert from "node:assert/strict";
import { test } from "node:test";
import { obterPermissoesTrilha } from "../src/services/trilhaPermissoes.js";

const usuario = { _id: "u1" };
test("visitante e dados sem autoria não habilitam controles", () => {
  assert.deepEqual(obterPermissoesTrilha({ autorId: "u1", permissoes: { excluir: true } }, null), { editar: false, excluir: false });
  assert.deepEqual(obterPermissoesTrilha({}, usuario), { editar: false, excluir: false });
  assert.deepEqual(obterPermissoesTrilha({ autorId: "u2" }, usuario), { editar: false, excluir: false });
});

test("autoria permite controles e permissões explícitas prevalecem", () => {
  assert.deepEqual(obterPermissoesTrilha({ autor: { _id: "u1" } }, usuario), { editar: true, excluir: true });
  assert.deepEqual(obterPermissoesTrilha({ autorId: "u1", permissoes: { excluir: false } }, usuario), { editar: true, excluir: false });
  assert.deepEqual(obterPermissoesTrilha({ autorId: "u2", permissoes: { editar: false, excluir: true } }, usuario), { editar: false, excluir: true });
});
