import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularRecorteAvatar, moverRecorteAvatar } from "../src/services/recorteAvatar.js";
test("recorte inicial é central e quadrado sem distorção", () => {
  assert.deepEqual(calcularRecorteAvatar(400, 200), { x: 100, y: 0, lado: 200, tamanho: 200 });
  assert.deepEqual(calcularRecorteAvatar(200, 400), { x: 0, y: 100, lado: 200, tamanho: 200 });
});
test("zoom e posições extremas permanecem dentro do original", () => {
  for (const zoom of [1, 1.5, 3]) for (const x of [-100, 0, 100]) for (const y of [-100, 0, 100]) {
    const r = calcularRecorteAvatar(1200, 800, { zoom, x, y });
    assert.ok(r.x >= 0 && r.y >= 0);assert.ok(r.x + r.lado <= 1200 && r.y + r.lado <= 800);
    assert.ok(r.tamanho <= Math.floor(r.lado) && r.tamanho <= 512);
  }
  assert.equal(calcularRecorteAvatar(1, 1, { zoom: 3 }).tamanho, 1);
  assert.throws(() => calcularRecorteAvatar(0, 20));assert.throws(() => calcularRecorteAvatar(NaN, 20));
});
test("arrastar desloca o recorte proporcionalmente e respeita os limites", () => {
  const original = { zoom: 1, x: 0, y: 0 };
  const ajuste = moverRecorteAvatar({ width: 400, height: 200 }, original, 70, 30, 280);
  assert.equal(ajuste.x, 50);assert.equal(ajuste.y, 0);
  assert.equal(moverRecorteAvatar({ width: 400, height: 200 }, original, 2000, 0, 280).x, 100);
  assert.deepEqual(moverRecorteAvatar({ width: 400, height: 200 }, original, 10, 0, 0), original);
});
