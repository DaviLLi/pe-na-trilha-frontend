const STORAGE_KEY = "pe-na-trilha:posts";

export function carregarPosts() {
  try {
    const postsSalvos = localStorage.getItem(STORAGE_KEY);

    if (!postsSalvos) {
      return { posts: [], erro: "" };
    }

    const posts = JSON.parse(postsSalvos);

    if (!Array.isArray(posts)) {
      return {
        posts: [],
        erro: "Os dados salvos estavam em formato inválido e foram reiniciados.",
      };
    }

    return { posts, erro: "" };
  } catch {
    return {
      posts: [],
      erro: "Não foi possível carregar os posts salvos neste navegador.",
    };
  }
}

export function salvarPosts(posts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    return "";
  } catch {
    return "Não foi possível salvar os posts no armazenamento local.";
  }
}
