import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { enviarFotoPerfil } from "../services/fotoPerfilService.js";
import { criarCacheImagensPublicacoes } from "../services/cacheImagensPublicacoes.js";
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
  const [sessao, setSessao] = useState({ usuario: null, cacheImagens: null });
  const sessaoAtual = useRef(sessao);
  const { usuario, cacheImagens } = sessao;
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [erroRestauracao, setErroRestauracao] = useState(false);

  const definirUsuario = useCallback((valor, novaSessao = false) => {
    const anterior = sessaoAtual.current;
    const proximoUsuario = typeof valor === "function" ? valor(anterior.usuario) : valor;
    const mesmaConta = proximoUsuario?._id && proximoUsuario._id === anterior.usuario?._id
      && proximoUsuario.perfil === anterior.usuario.perfil;
    const reutilizar = mesmaConta && !novaSessao;
    if (!reutilizar) anterior.cacheImagens?.encerrar();
    const proxima = {
      usuario: proximoUsuario,
      cacheImagens: proximoUsuario?._id
        ? (reutilizar ? anterior.cacheImagens : criarCacheImagensPublicacoes())
        : null,
    };
    sessaoAtual.current = proxima;
    setSessao(proxima);
  }, []);

  const logoutLocal = useCallback(() => {
    definirTokenCsrf(null);
    definirUsuario(null);
    setErroRestauracao(false);
  }, [definirUsuario]);

  useEffect(() => {
    definirTratadorNaoAutorizado(logoutLocal);
    return () => {
      definirTratadorNaoAutorizado(null);
      sessaoAtual.current.cacheImagens?.encerrar();
    };
  }, [logoutLocal]);

  const carregarSessao = useCallback(async () => {
    setCarregandoSessao(true);
    setErroRestauracao(false);
    try {
      const sessao = await renovarSessao();
      const csrf = await obterTokenCsrf();
      definirTokenCsrf(csrf);
      definirUsuario(sessao.usuario || (await buscarUsuarioAutenticado()));
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
  }, [definirUsuario, logoutLocal]);

  useEffect(() => {
    carregarSessao();
  }, [carregarSessao]);

  const login = useCallback(async (credenciais) => {
    const sessao = await solicitarLogin(credenciais);
    const csrf = await obterTokenCsrf();
    definirTokenCsrf(csrf);
    setErroRestauracao(false);
    definirUsuario(sessao.usuario, true);
    return sessao.usuario;
  }, [definirUsuario]);

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
    definirUsuario(dadosUsuario);
    return dadosUsuario;
  }, [definirUsuario]);

  const atualizarPerfil = useCallback(async (dados, config = {}) => {
    const atualizado = await atualizarUsuarioAtual(dados, config);
    if (!config.signal?.aborted) {
      definirUsuario((atual) => atual?._id === atualizado._id ? atualizado : atual);
    }
    return atualizado;
  }, [definirUsuario]);

  const usuarioId = usuario?._id;
  const atualizarFotoPerfil = useCallback(async (arquivo, config = {}) => {
    const resultado = await enviarFotoPerfil(arquivo, config);
    if (!config.signal?.aborted) definirUsuario((atual) => atual?._id === usuarioId ? { ...atual, fotoPerfil: resultado.fotoPerfil } : atual);
    return resultado;
  }, [definirUsuario, usuarioId]);

  const valor = useMemo(
    () => ({
      usuario,
      cacheImagens,
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
    [usuario, cacheImagens, carregandoSessao, erroRestauracao, login, logout, consultarUsuario, atualizarPerfil, atualizarFotoPerfil, carregarSessao],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
