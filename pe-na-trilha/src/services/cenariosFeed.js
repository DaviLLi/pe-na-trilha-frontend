const arquivos = import.meta.glob("../assets/cenarios-feed/*.png", {
  eager: true,
  import: "default",
  query: "?url",
});
export const cenariosFeed = Object.fromEntries(
  Object.entries(arquivos).map(([caminho, url]) => [caminho.split("/").pop(), url]),
);

const chaveSessao = "pe-na-trilha:cenario-feed:sessao:v1";
const chaveAnterior = "pe-na-trilha:cenario-feed:anterior:v1";
let sessaoEmMemoria = null;

function ler(tipo, chave) {
  try {
    return JSON.parse(window[tipo].getItem(chave));
  } catch {
    return null;
  }
}

function salvar(tipo, chave, valor) {
  try {
    if (valor === null) window[tipo].removeItem(chave);
    else window[tipo].setItem(chave, JSON.stringify(valor));
  } catch {
    // A sessão em memória continua disponível se o navegador bloquear o armazenamento.
  }
}

export function obterCenarioFeed(usuarioId) {
  if (!usuarioId) return null;
  if (sessaoEmMemoria?.usuarioId === usuarioId) return cenariosFeed[sessaoEmMemoria.cenario];

  const sessaoSalva = ler("sessionStorage", chaveSessao);
  if (sessaoSalva?.usuarioId === usuarioId && Object.hasOwn(cenariosFeed, sessaoSalva.cenario)) {
    sessaoEmMemoria = sessaoSalva;
    return cenariosFeed[sessaoSalva.cenario];
  }

  const chaveDoUsuario = `${chaveAnterior}:${usuarioId}`;
  const anterior = ler("localStorage", chaveDoUsuario);
  const cenarios = Object.keys(cenariosFeed);
  const candidatos = cenarios.length > 1 ? cenarios.filter((cenario) => cenario !== anterior) : cenarios;
  const cenario = candidatos[Math.floor(Math.random() * candidatos.length)];

  sessaoEmMemoria = { usuarioId, cenario };
  salvar("sessionStorage", chaveSessao, sessaoEmMemoria);
  salvar("localStorage", chaveDoUsuario, cenario);
  return cenariosFeed[cenario];
}

export function encerrarSessaoCenarioFeed() {
  sessaoEmMemoria = null;
  salvar("sessionStorage", chaveSessao, null);
}
