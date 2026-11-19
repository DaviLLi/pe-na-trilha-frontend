# Correções funcionais — 17/11/2026

## Diagnóstico e alterações

A implementação de frontend e backend foi examinada antes das alterações. Nenhum comando Git foi executado.

- Exclusão com múltiplas fotos: a versão instalada do Mongoose recusa `Model.create()` com sessão e mais de um documento sem `ordered: true` (verificação em `node_modules/mongoose/lib/model.js`). O controller criava uma operação por foto sem essa opção. A transação abortava: a publicação permanecia no banco. Corrigida a criação ordenada, preservando a transação entre remoção da publicação e registro da limpeza.
- Não há evidência de que essa restrição explique falhas com exatamente uma foto. Sem logs do ambiente afetado, não é possível atribuir todos os relatos a uma única causa.
- Sincronização: as telas mantinham estados independentes, sem notificação compartilhada de exclusão. O serviço agora notifica as listas após confirmação; o Feed também consulta novamente após a operação, inclusive em erro de resultado incerto, cancelando consultas antigas pelo mecanismo já existente. As respostas das listas pública e própria agora usam `no-store`. A autorização continua sendo o filtro por ID e proprietário no backend, precedido de autenticação e CSRF.
- Fotos sem `publicId` eram ignoradas no agendamento. Agora impedem a exclusão com 409, revertendo a transação e exigindo reparo dos metadados. Falhas ao iniciar a sessão passam pelo tratamento de erros.
- A remoção remota continua assíncrona: cada identidade mantém `resourceType` e `deliveryType`, incluindo `authenticated`. O worker existente trata indisponibilidade, repetição, leases e falhas persistidas. Após o limite de tentativas, a operação fica em `failed`, para investigação e reenvio por `reenfileirarOperacaoImagem`; isso não significa que o arquivo remoto já foi removido. Nenhuma exclusão remota é antecipada ao commit.
- Autor: a consulta pública carrega somente nome de usuário, nome completo e avatar. O DTO expõe esses campos em `autor`, mantendo `proprietario` como ID e sem expor e-mail ou senha. O card mostra identificação compacta e alternativa para avatar ausente ou com erro.
- Ampliação: o carrossel mantém dimensões, proporções e disposição. A foto ativa abre a galeria existente, com navegação, fechamento e gestos. O teclado do modal não altera o carrossel subjacente.
- Perfil vazio: o símbolo de adicionar agora é um Link acessível para `/trilhas/nova`.

As regras de aprovação/rejeição não foram alteradas.

## Arquivos editados

Frontend, a partir de `pe-na-trilha/`:

- `src/components/PublicacoesPerfil.jsx`
- `src/components/PostTrilha.jsx`
- `src/components/CarrosselPost.jsx`
- `src/components/GaleriaPublicacao.jsx`
- `src/pages/ListaTrilhas.jsx`
- `src/services/trilhasService.js`
- `src/styles/post.css`
- `tests/gerenciamentoPublicacoes.test.js`
- `tests/postTrilha.test.js`
- `tests/galeriaRotasAvatar.test.js`

Backend, a partir de `../pe-na-trilha-backend/`:

- `src/controllers/trilhaController.js`
- `src/domain/fotoPublicacao.js`
- `tests/trilhaRoutes.test.js`
- `tests/publicacaoDto.test.js`
- `tests/integration/infra.integration.js`

Documentação: este relatório. O build também gerou a saída `pe-na-trilha/dist/`.

## Validação executada

- Frontend: `node --test --test-concurrency=1 tests/*.test.js` — **159 testes passaram, zero falhas e zero ignorados**. A execução paralela padrão apresentou timeouts ao abrir instâncias do Chrome; a suíte completa foi repetida sequencialmente.
- Backend: `npm test -- --runInBand --coverageDirectory=/tmp/pnt-backend-coverage` — **35 suítes, 571 testes passaram**.
- Integração real: `npm run test:integration` — **2 suítes, 8 testes passaram**, em base MongoDB isolada com transações e Cloudinary real. O novo cenário cria duas fotos autenticadas, bloqueia exclusão por outro proprietário, exclui a publicação, consulta novamente o MongoDB, confirma as duas tarefas persistidas, executa o worker e verifica 404 para ambos os arquivos no Cloudinary. Também exclui publicação sem fotos. As duas operações de upload já concluídas permanecem no histórico, além das duas operações de limpeza concluídas.
- `npm run lint` — passou nos dois projetos.
- `npm run build` — passou no frontend. O backend JavaScript não possui script de build.

Os testes no Chrome usam API sintética. Cobrem exclusão por Perfil e Feed com e sem fotos, atualização sem logout, nova consulta ao remontar as duas telas, controles ausentes em publicações de terceiros, link do perfil vazio em 1280 e 390 pixels, abertura, navegação e fechamento da galeria, teclado e preservação do carrossel. Os testes de API verificam o filtro de propriedade, erro ao agendar limpeza e rejeição de foto sem identificação; a reversão real de transações também é exercitada pela suíte de infraestrutura existente.

## Limites e validação no ambiente publicado

A persistência no MongoDB e a remoção no Cloudinary foram verificadas de verdade, mas o navegador não foi conectado ao backend real nesta etapa. Ainda cabe smoke test no ambiente publicado: exclusão pelas duas telas com sessão real, atualização completa da página, nome/avatar reais e uso em dispositivo físico. Também devem ser conferidos o worker ativo, eventuais operações `failed` já existentes e metadados de fotos legadas no ambiente afetado. Não foi feita limpeza destrutiva de dados de produção, nem inventário de imagens antigas. A correção não prova retroativamente que todos os arquivos órfãos anteriores foram removidos.
