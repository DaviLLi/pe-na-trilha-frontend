# Quatro ajustes pontuais — 17/11/2026

## Alterações

1. Guia: removido exclusivamente o aviso desatualizado sobre a API não fornecer contagem de aprovações. Os cinco cards e o cálculo de progressão permanecem iguais.
2. Cabeçalhos: Feed e Perfil usam a mesma identificação do autor, com avatar (ou inicial quando ausente), nome completo, @ e data/hora real de `createdAt`. Esse conjunto vem antes do título. Descrição, localização, características, duração e fotos mantêm sua ordem. No Perfil, o autor vem da sessão para as publicações cujo proprietário corresponde ao usuário; isso não concede permissões adicionais.
3. Perfil vazio: o link “+” ganhou uma superfície verde escura, contorno, espaçamento e estados de foco, hover e clique. Os textos e o destino `/trilhas/nova` foram preservados.
4. Busca: o filtro anterior era somente local, aplicado a título, descrição e endereço. Agora o Feed consulta `GET /trilhas?busca=...`; o endpoint filtra o MongoDB e mantém `status: approved` como condição obrigatória.

Campos confirmados no schema e usados na busca: `titulo`, `descricao`, `endereco`, `tipoLocal`, `dificuldade`, `condicaoCaminho`, `sinalizacao`, `estacionamento`, `banheiro`, `alimentacao`, `estruturaBanho`, `acesso`, `caracteristicaPrincipal`. Duração é um objeto com `horas` e `minutos`: termos puramente numéricos de um ou dois dígitos também pesquisam esses campos por igualdade, sem aplicar regex a números. Autoria, metadados de imagens e notas de moderação não são campos de busca.

A busca é parcial e ignora caixa. Caracteres de regex são escapados e tratados literalmente; não há interpolação de operadores recebidos na consulta. O termo é limitado a 100 caracteres, rejeitando arrays e objetos. Consultas com filtro de busca têm `maxTimeMS(2000)`. No frontend, há espera de 300 ms e cancelamento de buscas anteriores; limpar o campo restaura a listagem. Não há um segundo filtro local ocultando os resultados do backend.

Não houve comandos Git nem alterações em autenticação, cookies, CSRF, autorização, upload ou regras de moderação. As melhorias de responsividade, datas, cores do banner e alinhamentos já presentes foram preservadas.

## Arquivos desta etapa

Frontend (sob `pe-na-trilha/`):

- `src/pages/GuiaMedalhas.jsx`
- `src/pages/ListaTrilhas.jsx`
- `src/components/AutorPublicacao.jsx` (novo componente compartilhado)
- `src/components/PostTrilha.jsx`
- `src/components/PublicacoesPerfil.jsx`
- `src/styles/product.css`
- `tests/galeriaRotasAvatar.test.js`

Backend (sob `../pe-na-trilha-backend/`):

- `src/domain/buscaPublicacoes.js`
- `src/controllers/trilhaController.js`
- `tests/buscaPublicacoes.test.js`
- `tests/integration/infra.integration.js`

Documentação: este relatório e as quatro capturas em `docs/validacao-quatro-ajustes/`. O build gerou novamente `pe-na-trilha/dist/`.

## Testes e resultados

- Frontend completo: `node --test --test-concurrency=1 tests/*.test.js` — **162 aprovados, zero falhas e zero ignorados**.
- Cenários visuais repetidos após ajustar o enquadramento das capturas do Perfil: `node --test tests/galeriaRotasAvatar.test.js` — **18 aprovados**.
- Backend completo: `npm test -- --runInBand --coverageDirectory=/tmp/pnt-four-coverage` — **36 suítes, 590 testes aprovados**.
- Integração real: `npm run test:integration` — **2 suítes, 9 testes aprovados**. O teste novo persiste documentos no MongoDB isolado, consulta o endpoint real por todas as respostas (incluindo “CaChO”), verifica busca literal de `.*`, duração numérica, nenhum resultado e exclusão de pendentes/rejeitadas. A suíte também mantém a validação real de sessão, CSRF, transações e Cloudinary.
- `npm run lint` — aprovado nos dois projetos.
- `npm run build` — aprovado no frontend. O backend JavaScript não possui script de build.

O navegador exercita o Guia sem o aviso e com cinco cards, o link do perfil vazio e sua navegação, a ordem espacial e de DOM de autor/data/título no Feed e Perfil, a consulta remota por característica, ausência de resultados e limpeza da busca. Também executa a matriz de Feed, Perfil, Editar perfil, nova publicação, edição, Administração e galeria em **320, 375, 390, 430, 768, 1024 e 1280 px**, verificando rolagem horizontal pela largura útil da página e alinhamentos do Feed. Capturas e medições anteriores e posteriores às melhorias visuais ficaram em `/tmp/pnt-visual-before/`, `/tmp/pnt-visual-after/` e `/tmp/pnt-four-visual/` nesta sessão.

Capturas finais selecionadas:

- [Feed desktop](validacao-quatro-ajustes/feed-desktop.png)
- [Cabeçalho do Perfil no celular](validacao-quatro-ajustes/perfil-celular.png)
- [Perfil vazio com foco no adicionar](validacao-quatro-ajustes/perfil-vazio-celular.png)
- [Busca por característica no celular](validacao-quatro-ajustes/busca-celular.png)

## Limites

Os testes visuais usam dados e API sintéticos; a integração da busca usa MongoDB real em base isolada, sem acessar a coleção de produção. Portanto, ainda cabe smoke test no ambiente publicado, navegador conectado à API implantada e aparelho físico. Não foi feita implantação.

Busca parcial sem distinção de caixa pode examinar muitos documentos aprovados: o índice existente em `status`, o limite do termo, a expressão literal e o tempo máximo limitam o risco, mas não substituem uma solução de pesquisa especializada caso o volume cresça. Não foram criados índices ou feita mudança de schema nesta etapa. Acentos não são removidos da consulta: ignorar acentos não fazia parte do requisito.
