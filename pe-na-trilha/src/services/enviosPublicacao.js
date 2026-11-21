import { criarTrilha, adicionarFotoTrilha } from "./trilhasService.js";
import { obterMensagemErro } from "./api.js";

export const cadastroInicial = { id: null, enviando: false, resultado: null, envios: [], erro: "" };

function mensagemApi(erro) {
  const detalhes = erro.response?.data?.erros;
  return [obterMensagemErro(erro), ...(Array.isArray(detalhes) ? detalhes.filter((item) => typeof item === "string") : [])].join(" ");
}

export function criarEnviosPublicacao() {
  const inscritos = new Set();
  let atual = cadastroInicial;
  let controle;
  let encerrado = false;

  function atualizar(dados) {
    atual = { ...atual, ...dados };
    for (const publicar of inscritos) publicar();
  }

  async function cadastrar(dados, fotos) {
    if (controle || encerrado) return;
    const controller = new AbortController();
    controle = controller;
    const { signal } = controller;
    atualizar({ ...cadastroInicial, id: Symbol(), enviando: true });
    try {
      const entrada = fotos.length ? { ...dados, fotosPrevistas: fotos.length } : dados;
      const publicacao = await criarTrilha(entrada, { signal });
      if (signal.aborted) return;
      if (!/^[a-f0-9]{24}$/i.test(publicacao?._id || "") || publicacao.status !== "pending"
        || (fotos.length && publicacao.fotosPrevistas !== fotos.length)) {
        atualizar({ resultado: "incerto", erro: "A API não confirmou o cadastro pendente esperado. Consulte suas publicações antes de tentar novamente." });
        return;
      }

      const progresso = fotos.map((foto) => ({ nome: foto.name, estado: "Aguardando envio" }));
      atualizar({ resultado: "criada", envios: [...progresso] });
      for (const [indice, foto] of fotos.entries()) {
        if (signal.aborted) return;
        progresso[indice] = { nome: foto.name, estado: "Enviando" };
        atualizar({ envios: [...progresso] });
        try {
          await adicionarFotoTrilha(publicacao._id, foto, { signal });
          if (signal.aborted) return;
          progresso[indice] = { nome: foto.name, estado: "Envio confirmado" };
          atualizar({ envios: [...progresso] });
        } catch (falha) {
          if (signal.aborted) return;
          progresso[indice] = { nome: foto.name, estado: "Envio não confirmado" };
          for (let restante = indice + 1; restante < progresso.length; restante++) {
            progresso[restante] = { ...progresso[restante], estado: "Envio não iniciado" };
          }
          atualizar({
            envios: [...progresso],
            erro: mensagemApi(falha) + " As fotos salvas foram preservadas. Confira o Perfil e adicione as que faltam para liberar a publicação para análise.",
          });
          return;
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("publicacoes:atualizadas", { detail: publicacao._id }));
      }
    } catch (falha) {
      if (!signal.aborted) {
        atualizar({
          erro: mensagemApi(falha),
          resultado: !falha.response || falha.response.status >= 500 ? "incerto" : null,
        });
      }
    } finally {
      if (!signal.aborted) {
        controle = null;
        atualizar({ enviando: false });
      }
    }
  }

  return {
    cadastrar,
    obterEstado: () => atual,
    inscrever(publicar) {
      inscritos.add(publicar);
      return () => inscritos.delete(publicar);
    },
    encerrar() {
      encerrado = true;
      controle?.abort();
      controle = null;
      atual = cadastroInicial;
      inscritos.clear();
    },
  };
}
