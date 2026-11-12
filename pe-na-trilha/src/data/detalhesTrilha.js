export const perguntasTrilha = [
  { chave: "tipoLocal", titulo: "Tipo de local", descricao: "Que tipo de lugar a trilha percorre?", opcoes: ["Trilha", "Praia", "Cachoeira"] },
  { chave: "dificuldade", titulo: "Dificuldade", descricao: "Como você avalia o percurso?", opcoes: ["Fácil", "Moderada", "Difícil"] },
  { chave: "condicaoCaminho", titulo: "Condição do caminho", descricao: "Qual superfície predomina no caminho?", opcoes: ["Terra", "Pedra", "Areia"] },
  { chave: "sinalizacao", titulo: "Sinalização", descricao: "Como é a sinalização ao longo do percurso?", opcoes: ["Boa", "Parcial", "Sem sinalização"] },
  { chave: "estacionamento", titulo: "Estacionamento", descricao: "Há estacionamento no local?", opcoes: ["Gratuito", "Pago", "Não possui"] },
  { chave: "banheiro", titulo: "Banheiro", descricao: "Há banheiro disponível para visitantes?", opcoes: ["Sim", "Não", "Não sei informar"] },
  { chave: "alimentacao", titulo: "Alimentação", descricao: "Que opção de alimentação existe no local?", opcoes: ["Lanchonete", "Quiosque", "Não possui"] },
  { chave: "estruturaBanho", titulo: "Estrutura para banho", descricao: "Que estrutura para banho o local oferece?", opcoes: ["Chuveiro", "Área de banho", "Não possui"] },
  { chave: "acesso", titulo: "Acesso", descricao: "Como visitantes podem acessar o local?", opcoes: ["Livre", "Controlado", "Com autorização"] },
];

export const caracteristicasPorLocal = {
  Trilha: ["Rio", "Mirante", "Vegetação"],
  Praia: ["Mar", "Areia", "Costão"],
  Cachoeira: ["Queda d'água", "Piscina natural", "Rio"],
};

export const chavesRespostasTrilha = [
  ...perguntasTrilha.map(({ chave }) => chave),
  "caracteristicaPrincipal",
];

export const rotulosDetalhesTrilha = {
  tipoLocal: "Local",
  dificuldade: "Dificuldade",
  condicaoCaminho: "Caminho",
  sinalizacao: "Sinalização",
  estacionamento: "Estacionamento",
  banheiro: "Banheiro",
  alimentacao: "Alimentação",
  estruturaBanho: "Banho",
  acesso: "Acesso",
  caracteristicaPrincipal: "Destaque",
};

export function obterDetalhesTrilha(trilha) {
  if (!trilha) return [];
  return chavesRespostasTrilha
    .map((chave) => ({ chave, valor: trilha[chave] }))
    .filter(({ valor }) => typeof valor === "string" && valor.trim());
}
