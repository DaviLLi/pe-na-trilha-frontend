import { useCallback, useEffect, useMemo, useState } from "react";
import { enviarFotoPerfil } from "../services/fotoPerfilService.js";
import AuthContext from "./authContextValue.js";
import {
  definirTokenCsrf,
  definirTratadorNaoAutorizado,
} from "../services/api.js";
import {
  buscarUsuarioAutenticado,
  atualizarUsuarioAtual,
  loginUsuario as solicitarLogin,
  logoutUsuario,
  obterTokenCsrf,
  renovarSessao,
} from "../services/authService.js";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [erroRestauracao, setErroRestauracao] = useState(false);

  const logoutLocal = useCallback(() => {
    definirTokenCsrf(null);
    setUsuario(null);
    setErroRestauracao(false);
  }, []);

  useEffect(() => {
    definirTratadorNaoAutorizado(logoutLocal);
    return () => definirTratadorNaoAutorizado(null);
  }, [logoutLocal]);

  const carregarSessao = useCallback(async () => {
    setCarregandoSessao(true);
    setErroRestauracao(false);
    try {
      const sessao = await renovarSessao();
      const csrf = await obterTokenCsrf();
      definirTokenCsrf(csrf);
      setUsuario(sessao.usuario || (await buscarUsuarioAutenticado()));
      return true;
    } catch (erro) {
      if (erro.response?.status === 401) {
        logoutLocal();
      } else {
        // Rede, 409 concorrente e erros 5xx não provam que a sessão expirou.
        setErroRestauracao(true);
      }
      return false;
    } finally {
      setCarregandoSessao(false);
    }
  }, [logoutLocal]);

  useEffect(() => {
    carregarSessao();
  }, [carregarSessao]);

  const login = useCallback(async (credenciais) => {
    const sessao = await solicitarLogin(credenciais);
    const csrf = await obterTokenCsrf();
    definirTokenCsrf(csrf);
    setErroRestauracao(false);
    setUsuario(sessao.usuario);
    return sessao.usuario;
  }, []);

  const logout = useCallback(async () => {
    try {
      // Renovar estabelece um access cookie válido caso ele tenha expirado.
      await renovarSessao();
      definirTokenCsrf(await obterTokenCsrf());
      await logoutUsuario();
    } catch (erro) {
      if (erro.response?.status === 401) {
        logoutLocal();
        return;
      }
      throw erro;
    }
    logoutLocal();
  }, [logoutLocal]);

  const consultarUsuario = useCallback(async () => {
    const dadosUsuario = await buscarUsuarioAutenticado();
    setUsuario(dadosUsuario);
    return dadosUsuario;
  }, []);

  const atualizarPerfil = useCallback(async (dados, config = {}) => {
    const atualizado = await atualizarUsuarioAtual(dados, config);
    if (!config.signal?.aborted) {
      setUsuario((atual) => atual?._id === atualizado._id ? atualizado : atual);
    }
    return atualizado;
  }, []);

  const usuarioId = usuario?._id;
  const atualizarFotoPerfil = useCallback(async (arquivo, config = {}) => {
    const resultado = await enviarFotoPerfil(arquivo, config);
    if (!config.signal?.aborted) setUsuario((atual) => atual?._id === usuarioId ? { ...atual, fotoPerfil: resultado.fotoPerfil } : atual);
    return resultado;
  }, [usuarioId]);

  const valor = useMemo(
    () => ({
      usuario,
      autenticado: Boolean(usuario),
      carregandoSessao,
      erroRestauracao,
      login,
      logout,
      consultarUsuario,
      atualizarPerfil,
      atualizarFotoPerfil,
      tentarRestaurarSessao: carregarSessao,
    }),
    [usuario, carregandoSessao, erroRestauracao, login, logout, consultarUsuario, atualizarPerfil, atualizarFotoPerfil, carregarSessao],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
