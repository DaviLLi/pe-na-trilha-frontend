# Galeria, avatar e acesso às páginas

- Rotas internas exigem sessão no frontend. Administração exige `perfil: "admin"`; o backend mantém a autorização de cada operação.
- Login preserva apenas destinos internos conhecidos, com validação do papel administrativo. Login, cadastro, termos e privacidade permanecem acessíveis sem sessão.
- A galeria usa `detalhe`, via URL interna no Feed e Axios/Blob no Perfil. Não gera assinaturas Cloudinary. URLs de Blob são revogadas na troca, erro e desmontagem; requests privados são cancelados.
- Miniaturas e variantes são limitadas pelo contrato do backend. Fotos antigas com `url: null` não são reconstruídas nem consideradas migradas.
- A proteção de navegação não privatiza endpoints de leitura pública já existentes. Fotos aprovadas continuam públicas na API conforme o contrato atual.
- Avatar é um fluxo separado: `PUT /usuarios/me/foto-perfil`, multipart com um `imagem`, até 5 MiB, JPEG/PNG/WebP. O sucesso contém `{ "fotoPerfil": "URL pública" }`. O contexto de sessão atualiza Perfil e menu; a persistência depende do backend e é recuperada nos DTOs de login/refresh/me, sem localStorage.
- Feed e Perfil consultam novamente ao retornar à aba, além da atualização manual. Criação e aprovação mantêm os estados e endpoints anteriores; a criação não libera navegação pelo link de sucesso enquanto envia as fotos.
- A tipografia existente recebeu aproximadamente 15% nos valores de tamanho. A raiz rem, dimensões dos ícones, paddings e gaps anteriores foram preservados.

A validação automatizada usa API e imagens sintéticas locais. Cloudinary, Atlas, cookies/CORS em HTTPS e persistência real devem ser verificados em ambiente autorizado. Nenhum asset real foi alterado.

## Arquivos desta implementação

- `src/App.jsx`
- `src/services/trilhaPermissoes.js`
- `src/services/fotoPerfilService.js`
- `src/services/navegacaoSegura.js`
- `src/contexts/AuthContext.jsx`
- `src/pages/Login.jsx`
- `src/pages/Perfil.jsx`
- `src/pages/CadastroTrilha.jsx`
- `src/pages/ListaTrilhas.jsx`
- `src/components/Sidebar.jsx`
- `src/components/GaleriaPublicacao.jsx`
- `src/components/PostTrilha.jsx`
- `src/components/PublicacoesPerfil.jsx`
- `src/components/EditorFotoPerfil.jsx`
- `src/styles/header.css`
- `src/styles/product.css`
- `src/styles/style.css`
- `src/styles/auth.css`
- `src/styles/sidebar.css`
- `src/styles/newPost.css`
- `src/styles/post.css`
- `src/styles/community.css`
- `tests/navegacaoFotoPerfilService.test.js`
- `tests/galeriaRotasAvatar.test.js`
- `tests/trilhaPermissoes.test.js`
- `tests/perfilPublicacoes.test.js`
- `tests/helpers/chrome.js`
- `docs/galeria-avatar-acesso.md` (documentação na pasta externa do repositório).

## Validação local

- Testes relacionados: 17 passaram, incluindo gesto real via CDP, ESC, URLs Blob, revogação de sessão, criação/aprovação e avatar após novo login.
- Suíte completa: 150 passaram, sem falhas ou testes ignorados.
- Lint e build de produção passaram; build gerado em `/tmp/pnt-navigation-gallery-build`.
- Capturas de desktop, tablet e celular revisadas com dados sintéticos. São testes em Chrome local, não comprovação de Cloudinary/Atlas reais ou de aparelhos físicos.
