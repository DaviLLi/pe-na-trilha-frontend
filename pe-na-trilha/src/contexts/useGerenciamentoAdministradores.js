import { useCallback, useEffect, useState } from "react";
import { listarAdministradores, mensagemGerenciamentoAdmin } from "../services/administradoresService.js";

export function useGerenciamentoAdministradores(usuario, naPagina) {
  const [resultado, definirResultado] = useState(null);
  const [versao, definirVersao] = useState(0);
  const admin = usuario?.perfil === "admin" && Boolean(usuario._id);

  useEffect(() => {
    if (!admin) return;
    const controller = new AbortController();
    async function consultar() {
      try {
        const lista = await listarAdministradores({ signal: controller.signal });
        if (controller.signal.aborted) return;
        const principal = lista.filter((conta) => conta.principal);
        if (principal.length === 1 && principal[0]._id === usuario._id) {
          definirResultado({ usuario, versao, naPagina, autorizado: true, lista: naPagina ? lista : undefined });
        } else {
          definirResultado({ usuario, versao, naPagina, bloqueado: true, erro: mensagemGerenciamentoAdmin({ response: { status: 403 } }) });
        }
      } catch (falha) {
        if (controller.signal.aborted) return;
        const status = falha.response?.status;
        definirResultado({
          usuario, versao, naPagina, bloqueado: status === 403 || status === 401,
          erro: mensagemGerenciamentoAdmin(falha),
        });
      }
    }
    void consultar();
    return () => controller.abort();
  }, [admin, usuario, versao, naPagina]);

  const recarregar = useCallback(() => definirVersao((atual) => atual + 1), []);
  const bloquear = useCallback((erro) => {
    definirResultado({ usuario, versao, naPagina, bloqueado: true, erro });
  }, [usuario, versao, naPagina]);

  const atual = admin && resultado?.usuario === usuario ? resultado : null;
  const consultaAtual = atual?.versao === versao && atual?.naPagina === naPagina;
  return {
    autorizado: atual?.autorizado === true,
    lista: naPagina && atual?.naPagina ? atual.lista : undefined,
    carregando: !consultaAtual,
    erro: consultaAtual ? atual.erro : "",
    bloqueado: Boolean(consultaAtual && atual.bloqueado),
    recarregar,
    bloquear,
  };
}
