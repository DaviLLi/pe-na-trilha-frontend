import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

export function obterMensagemErro(erro) {
  return (
    erro.response?.data?.mensagem ||
    "Não foi possível concluir a operação. Verifique se a API está disponível."
  );
}

export default api;
