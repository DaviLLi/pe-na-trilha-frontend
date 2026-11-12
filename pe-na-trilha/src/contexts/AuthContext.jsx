import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import AuthContext from "./authContextValue.js";
import {
  definirToken,
  definirTratadorNaoAutorizado,
} from "../services/api.js";
import {
  buscarUsuarioAutenticado,
  loginUsuario as solicitarLogin,
} from "../services/authService.js";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);

  const logout = useCallback(() => {
    definirToken(null);
    setToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    definirTratadorNaoAutorizado(logout);
    return () => definirTratadorNaoAutorizado(null);
  }, [logout]);

  const login = useCallback(async (credenciais) => {
    const sessao = await solicitarLogin(credenciais);
    definirToken(sessao.token);
    setToken(sessao.token);
    setUsuario(sessao.usuario);
    return sessao.usuario;
  }, []);

  const consultarUsuario = useCallback(async () => {
    const dadosUsuario = await buscarUsuarioAutenticado();
    setUsuario(dadosUsuario);
    return dadosUsuario;
  }, []);

  const valor = useMemo(
    () => ({
      token,
      usuario,
      autenticado: Boolean(token),
      login,
      logout,
      consultarUsuario,
    }),
    [token, usuario, login, logout, consultarUsuario],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
