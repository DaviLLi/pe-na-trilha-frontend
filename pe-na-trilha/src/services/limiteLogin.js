const ESPERA_SEM_HEADER_MS = 5 * 60_000;
const CHAVE_BLOQUEIO = "pe-na-trilha:login:retry-after";

export function calcularFimBloqueioLogin(headers, agora = Date.now()) {
  const valor = String(headers?.get?.("Retry-After") ?? headers?.["retry-after"] ?? "").trim();
  if (/^\d+$/.test(valor)) {
    const fim = agora + Number(valor) * 1000;
    if (Number.isSafeInteger(fim)) return fim;
  } else if (/^[a-z]/i.test(valor)) {
    const fim = Date.parse(valor);
    if (Number.isFinite(fim)) return Math.max(agora, fim);
  }
  // Mesmo sem acesso ao header via CORS, evita novas tentativas dentro da janela vigente.
  return agora + ESPERA_SEM_HEADER_MS;
}

export function lerFimBloqueioLogin() {
  try {
    const valor = Number(sessionStorage.getItem(CHAVE_BLOQUEIO));
    return Number.isSafeInteger(valor) && valor > Date.now() ? valor : 0;
  } catch {
    return 0;
  }
}

export function guardarFimBloqueioLogin(fim) {
  try {
    sessionStorage.setItem(CHAVE_BLOQUEIO, String(fim));
  } catch {
    // O contador da tela funciona quando o navegador desabilita o armazenamento.
  }
}
