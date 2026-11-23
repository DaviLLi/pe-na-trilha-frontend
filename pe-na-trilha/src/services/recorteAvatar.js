const limitar = (valor, minimo, maximo) => Math.max(minimo, Math.min(maximo, valor));
export const AJUSTE_INICIAL_AVATAR = { zoom: 1, x: 0, y: 0 };

export function calcularRecorteAvatar(largura, altura, ajuste = AJUSTE_INICIAL_AVATAR) {
  if (![largura, altura].every((valor) => Number.isFinite(valor) && valor >= 1)) throw new Error("Dimensões de imagem inválidas.");
  const zoom = limitar(Number.isFinite(ajuste.zoom) ? ajuste.zoom : 1, 1, Math.min(3, largura, altura));
  const lado = Math.min(largura, altura) / zoom;
  const x = limitar(Number.isFinite(ajuste.x) ? ajuste.x : 0, -100, 100);
  const y = limitar(Number.isFinite(ajuste.y) ? ajuste.y : 0, -100, 100);
  return {
    x: (largura - lado) * (1 - x / 100) / 2,
    y: (altura - lado) * (1 - y / 100) / 2,
    lado,
    tamanho: Math.max(1, Math.min(512, Math.floor(lado))),
  };
}

export function moverRecorteAvatar(imagem, ajuste, deltaX, deltaY, larguraVisivel) {
  const recorte = calcularRecorteAvatar(imagem.width, imagem.height, ajuste);
  if (!Number.isFinite(larguraVisivel) || larguraVisivel <= 0) return ajuste;
  const deslocar = (dimensao, delta, atual) => dimensao > recorte.lado
    ? limitar(atual + delta * recorte.lado * 200 / (larguraVisivel * (dimensao - recorte.lado)), -100, 100) : 0;
  return { ...ajuste, x: deslocar(imagem.width, deltaX, ajuste.x), y: deslocar(imagem.height, deltaY, ajuste.y) };
}

export async function gerarArquivoAvatar(imagem, ajuste) {
  const recorte = calcularRecorteAvatar(imagem.width, imagem.height, ajuste);
  const canvas = document.createElement("canvas");canvas.width = canvas.height = recorte.tamanho;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Não foi possível preparar a foto.");
  contexto.beginPath();contexto.arc(recorte.tamanho / 2, recorte.tamanho / 2, recorte.tamanho / 2, 0, Math.PI * 2);contexto.clip();
  contexto.drawImage(imagem, recorte.x, recorte.y, recorte.lado, recorte.lado, 0, 0, recorte.tamanho, recorte.tamanho);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Não foi possível preparar a foto.");
  return new File([blob], "avatar-recortado.png", { type: "image/png" });
}
