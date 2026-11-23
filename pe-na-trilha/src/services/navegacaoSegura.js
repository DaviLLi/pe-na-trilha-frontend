const INTERNA = /^(?:\/|\/trilhas(?:\/nova|\/[a-f0-9]{24}\/editar)?|\/perfil|\/ajuda|\/medalhas|\/admin(?:\/administradores)?)$/i;
export function destinoAposLogin(origem, usuario) {
  if (!origem || typeof origem.pathname !== "string" || !INTERNA.test(origem.pathname)) return "/trilhas";
  if (/^\/admin(?:\/|$)/i.test(origem.pathname) && usuario?.perfil !== "admin") return "/trilhas";
  const search = typeof origem.search === "string" && origem.search.startsWith("?") ? origem.search : "";
  const hash = typeof origem.hash === "string" && origem.hash.startsWith("#") ? origem.hash : "";
  if ([...search + hash].some((caractere) => caractere.charCodeAt(0) < 32 || caractere.charCodeAt(0) === 127)) return "/trilhas";
  return { pathname: origem.pathname, search, hash };
}
