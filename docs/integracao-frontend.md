# Contrato de integração — Pé na Trilha

Consolidação de 13/11/2026. Este documento descreve o contrato confirmado do
backend e as diferenças encontradas no frontend local. Não significa que os fluxos
já estejam integrados ou validados com serviços reais.

Nesta tarefa somente este documento foi atualizado. Componentes, serviços,
funcionalidades e backend permanecem sem alterações. Todos os caminhos de código
frontend abaixo são relativos a `pe-na-trilha/`; este documento fica em `docs/`.

## 1. Convenções de dados e autenticação

- Publicações e usuários usam `_id`. Cada foto também possui seu próprio `_id`.
- A autoria da publicação está em `proprietario`, contendo o ID do usuário.
  Comparar com `usuario._id`; não esperar `autorId` ou `autor._id`.
- O papel está em `usuario.perfil`: `user` ou `admin`. Não existe campo `role`
  confirmado, nem objeto `permissoes` no DTO atual.
- A API aplica propriedade, estado e papel administrativo. Controles no React
  apenas refletem essas regras; não substituem autorização.
- URLs de fotos de publicações são relativas à origem da API, configurada no
  frontend por `VITE_API_URL` (fallback atual: `http://localhost:3000`).
- O cliente Axios existente usa `withCredentials`, CSRF em mutações e renovação
  após 401. Não enviar JWT ou credenciais Cloudinary no corpo de formulários.

Endpoints de sessão existentes:

| Método e caminho | Contrato |
| --- | --- |
| `POST /usuarios` | Cadastro; retorna usuário direto, não inicia sessão. |
| `POST /usuarios/login` | Retorna `{ "usuario": { ... } }` e define cookies HttpOnly. |
| `POST /usuarios/refresh` | Rotaciona refresh, retorna o mesmo envelope e renova cookies. |
| `GET /usuarios/me` | Retorna usuário direto, incluindo `perfil` e `fotoPerfil`. |
| `GET /usuarios/csrf` | Retorna `{ "csrfToken": "..." }` para sessão válida. |
| `POST /usuarios/logout` | Revoga a sessão e retorna 204 sem corpo. |

Os envelopes acima indicam estrutura, não exemplos completos de usuário. O DTO de
usuário contém `_id`, `nomeCompleto`, `nomeUsuario`, `email`, `perfil`, `fotoPerfil`,
`createdAt` e `updatedAt`; não contém tokens nem `trilhasAprovadas`.

Login, refresh e logout exigem Origin permitido pelo backend. Mutações autenticadas
por cookie exigem `X-CSRF-Token`; leituras não exigem CSRF. Cookies e Bearer exigem
sessão revogável válida; JWT legado sem `sid` é rejeitado. O access token dura 15
minutos e a sessão tem validade absoluta de 30 dias. Refresh concorrente pode
retornar 409; o interceptor atual não converte isso automaticamente em sucesso.

## 2. Endpoints de publicações e respostas

| Método e caminho | Acesso e comportamento | Sucesso |
| --- | --- | --- |
| `GET /trilhas` | Público; somente `approved`, mais recentes primeiro. | 200, array direto |
| `GET /trilhas/:id` | Público; somente publicação aprovada. | 200, objeto direto |
| `GET /trilhas/minhas` | Sessão; publicações do proprietário, todos os estados, mais recentes primeiro. | 200, array direto |
| `GET /trilhas/minhas/:id` | Sessão e propriedade; detalhes inclusive pending/rejected. | 200, objeto direto |
| `GET /trilhas/pendentes` | Admin; somente pending, mais antigas primeiro. | 200, array direto |
| `POST /trilhas` | Sessão e CSRF; autoria derivada da sessão e estado inicial pending. | 201, publicação no contexto do autor |
| `PUT /trilhas/:id` ou `PATCH /trilhas/:id` | Proprietário e CSRF; edição parcial conforme estado. | 200, publicação no contexto do autor |
| `DELETE /trilhas/:id` | Proprietário e CSRF; exclui publicação e agenda limpeza das fotos. | 204, sem corpo |
| `POST /trilhas/:id/moderacao` | Admin e CSRF; somente publicação pending. | 200, publicação no contexto administrativo |
| `POST /trilhas/:id/reenviar` | Proprietário e CSRF; somente rejected. | 200, publicação no contexto do autor |

As listagens não possuem envelope de paginação, total ou filtros adicionais
confirmados. Não presumir endpoints de detalhes administrativos ou listagens
administrativas de aprovadas/rejeitadas: eles não existem no contrato atual.

O DTO público contém `_id`, `titulo`, `descricao`, `endereco`, as dez características,
`duracao`, `proprietario`, `status`, datas e `fotos`. Não expõe motivo de rejeição,
histórico ou identificadores de moderadores. Consultas autorizadas do proprietário
e administrativas preservam `motivoRejeicao` e `historicoModeracao`; isso não libera
os identificadores internos de armazenamento das fotos.

## 3. Criação, características e duração

Criação e edição dos dados usam JSON, separadamente do envio de arquivos.
Título, descrição e endereço são textos obrigatórios não vazios na criação.
Exemplo válido de request de criação:

```json
{
  "titulo": "Trilha do Mirante",
  "descricao": "Percurso com vista para a mata.",
  "endereco": "Cidade Exemplo, SC",
  "tipoLocal": "Trilha",
  "caracteristicaPrincipal": "Mirante",
  "duracao": { "horas": 2, "minutos": 30 }
}
```

Não enviar `fotos`, status, histórico ou dados de moderação nesse JSON. O servidor
define a autoria; o frontend não precisa enviar `proprietario`.

As dez características são opcionais e usam os valores abaixo, correspondentes a
`src/data/detalhesTrilha.js`:

| Campo | Valores aceitos |
| --- | --- |
| `tipoLocal` | Trilha, Praia, Cachoeira |
| `dificuldade` | Fácil, Moderada, Difícil |
| `condicaoCaminho` | Terra, Pedra, Areia |
| `sinalizacao` | Boa, Parcial, Sem sinalização |
| `estacionamento` | Gratuito, Pago, Não possui |
| `banheiro` | Sim, Não, Não sei informar |
| `alimentacao` | Lanchonete, Quiosque, Não possui |
| `estruturaBanho` | Chuveiro, Área de banho, Não possui |
| `acesso` | Livre, Controlado, Com autorização |
| `caracteristicaPrincipal` | Depende de tipoLocal, conforme tabela seguinte. |

| tipoLocal | caracteristicaPrincipal |
| --- | --- |
| Trilha | Rio, Mirante, Vegetação |
| Praia | Mar, Areia, Costão |
| Cachoeira | Queda d'água, Piscina natural, Rio |

Na edição, omitir uma característica preserva o valor; enviar `null` limpa.
Strings vazias não são valores de limpeza. Trocar ou limpar tipoLocal sem enviar
caracteristicaPrincipal limpa o destaque anterior no backend. Destaque incompatível
com o tipo efetivo é rejeitado. O preparador atual do frontend omite respostas
vazias, portanto ainda precisa ser adaptado para limpar valores persistidos.

`duracao` aceita `null` ou objeto com exatamente `horas` e `minutos`: inteiros,
horas 0–23, minutos 0–59, total positivo. Não aceita texto, 00:00 ou propriedades
extras. O Feed ainda lê texto legado, mas isso não autoriza enviá-lo ao backend.

## 4. Estados, edição, exclusão e moderação

| Estado | Dados básicos: título, descrição, endereço | Dez características e duração | Fotos | Efeito de salvar |
| --- | --- | --- | --- | --- |
| `pending` | Autor pode editar | Autor pode editar | Autor pode adicionar, substituir e remover | Permanece pending |
| `rejected` | Autor pode corrigir | Autor pode corrigir | Autor pode adicionar, substituir e remover | Permanece rejected; motivo preservado |
| `approved` | Bloqueados | Autor pode editar | Alterações bloqueadas | Permanece approved |

O proprietário pode excluir sua publicação. Admin não recebe permissão de editar
conteúdo ou fotos de terceiros apenas por ser admin. Visualização não concede edição.

Ao editar uma aprovada, enviar somente os campos permitidos que se deseja alterar;
não reenviar título, descrição e endereço mesmo que estejam iguais. Requisições
mistas são rejeitadas integralmente. Campos internos/desconhecidos também não são
aceitos. Registros legados sem estado válido exigem revisão, não devem ser tratados
como aprovados por ausência de status.

Decisão administrativa usa exatamente um dos corpos:

```json
{"status":"approved"}
```

```json
{"status":"rejected","motivo":"Corrigir localização."}
```

Rejeição exige motivo não vazio, até 2000 caracteres. Aprovação não aceita motivo.
A decisão exige estado pending; publicação inexistente ou fora desse estado retorna
409. Aprovar não altera o tipo do asset Cloudinary: libera somente a entrega pública
pelo backend. Aprovar também não comprova que fotos legadas foram migradas.

Reenvio é uma ação explícita, com corpo vazio (`{}`), em
`POST /trilhas/:id/reenviar`. Somente ela muda uma rejeitada corrigida para pending.
O motivo continua disponível e o histórico recebe `resubmitted`. Aprovação posterior
limpa o motivo atual, preservando as rejeições históricas.

## 5. DTO de fotos e contextos de leitura

Exemplo de objeto de foto retornado pelo Feed, com dados fictícios:

```json
{
  "_id": "000000000000000000000003",
  "url": "/trilhas/000000000000000000000001/fotos/000000000000000000000003/conteudo",
  "width": 800,
  "height": 600,
  "storageState": "ready",
  "createdAt": "2026-11-13T12:00:00.000Z",
  "updatedAt": "2026-11-13T12:00:00.000Z"
}
```

`_id` identifica a foto; `fotoId` é o nome do parâmetro da rota. Não existem
`publicId`, `assetId`, assinatura ou credenciais Cloudinary nos DTOs. Dimensões e
datas antigas ausentes podem ser omitidas no JSON. Dimensões descrevem o asset
armazenado, não garantem o tamanho exato da variante.

| Contexto | Endpoint GET de bytes | Autorização |
| --- | --- | --- |
| Feed público | `/trilhas/:id/fotos/:fotoId/conteudo` | Publicação approved, sem exigir login. |
| Proprietário | `/trilhas/minhas/:id/fotos/:fotoId/conteudo` | Sessão e propriedade; pending, rejected ou approved. |
| Administração | `/admin/trilhas/:id/fotos/:fotoId/conteudo` | Sessão e perfil admin; pending, rejected ou approved. |

O campo `url` já usa o contexto apropriado: público nas consultas públicas, autor
nas consultas próprias/criação/edição/upload, admin na fila e decisões administrativas.
Não usar a URL do autor para visualizar publicação de terceiro como administrador.

O sucesso é 200 com bytes `image/webp`, sem JSON, base64 ou redirect Cloudinary.
Selecionar `?variante=miniatura` (limite 480×360) ou `?variante=detalhe` (limite
1600×1600). São limites preservando proporção, não dimensões fixas. Sem parâmetro,
usa detalhe; parâmetro vazio, duplicado, desconhecido ou extra retorna 400.
Não inventar parâmetros de transformação. HEAD verifica acesso sem baixar a imagem.

Resolver `url` usando a origem configurada da API; não usar a origem do site React.
Feed pode usar a URL pública absoluta em img, com miniatura e lazy loading. Para
proprietário/admin, a integração futura deve usar Axios com `responseType: blob`,
withCredentials e o refresh existente, criando object URL para apresentação.
Revogar object URLs ao trocar imagem, desmontar ou sair; cancelar requests pendentes.
Não persistir imagens privadas em localStorage, service worker ou cache offline.

Erros JSON em requests com responseType blob também podem chegar como Blob; o
tratamento de mensagem precisará considerar isso. GETs privados com access expirado
podem ser repetidos após refresh válido. Revogação impede novas consultas, mas não
remove bytes já recebidos.

Todas as entregas usam `Cache-Control: private, no-store`; não há renovação temporal
de URL interna. Cada nova entrega privada revalida a sessão. Headers incluem nosniff,
no-referrer, CSP restritiva e Vary por Origin/Cookie/Authorization no handler de bytes.
Negativas anteriores de autenticação não necessariamente recebem esses mesmos headers.

Fotos antigas podem retornar `url: null`; apresentar indisponibilidade sem tentar
reconstruir uma URL Cloudinary. `ready` isolado não substitui a validação de proteção
feita pelo backend. Bloquear a entrega interna não revoga URLs públicas antigas.
A migração do acervo é uma tarefa separada, ainda dependente de aprovação e execução.

## 6. Upload e gerenciamento de fotos

| Método e caminho | Request | Sucesso |
| --- | --- | --- |
| `POST /trilhas/:id/fotos` | multipart/form-data, arquivo único em imagem | 201, objeto de foto com URL do autor |
| `PUT /trilhas/:id/fotos/:fotoId` | Mesmo formato | 200, objeto de foto com URL do autor |
| `DELETE /trilhas/:id/fotos/:fotoId` | Sem arquivo | 204, sem corpo |

Essas operações exigem proprietário, sessão e CSRF por cookie. São permitidas somente
em pending/rejected; approved retorna negativa. O backend revalida propriedade e
estado durante a associação; uma aprovação concorrente pode impedir o upload.

Regras do multipart:

- Campo único `imagem`, um arquivo por requisição, sem campos textuais adicionais.
- JPEG, PNG ou WebP, verificados pelo conteúdo do arquivo.
- Máximo de 5 MiB por foto e cinco fotos por publicação, incluindo fotos existentes.
- Dados da publicação devem ser enviados separadamente em JSON.
- CSRF vai no header `X-CSRF-Token`, não em um campo do FormData.
- Na integração futura, deixar o navegador definir o boundary do multipart.

Não existe upload múltiplo atômico. Criar primeiro a publicação pending e então
adicionar cada foto pelo ID retornado. Se uma adição falhar, as anteriores podem
estar salvas; a publicação não é automaticamente desfeita. Não repetir POST de upload
cegamente após resultado de rede incerto: reconciliar as fotos existentes primeiro.

As respostas de adição/substituição são objetos de foto, não a publicação inteira.
Substituição mantém o `_id` e a posição; é necessário descartar o Blob antigo.
Remoção confirma retirada da referência e agendamento de limpeza, não exclusão
remota já concluída. Recuperação e retentativas remotas pertencem ao backend.

A ordem é a do array persistido; adição acrescenta ao final. Não há reordenação nem
foto principal configurável. `fotos[0]` é apenas a convenção de capa. Para preservar
ordem de seleção na integração futura, preferir adições sequenciais; requisições
paralelas podem concluir em ordem diferente.

Fotos de perfil são um fluxo separado: `PUT /usuarios/me/foto-perfil` usa o mesmo
multipart e limite por arquivo, retornando 200 com `fotoPerfil` como URL pública.
`DELETE /usuarios/me/foto-perfil` retorna 200 com `{ "fotoPerfil": null }`.
Essas URLs públicas não devem ser convertidas em endpoints privados de publicação.

## 7. Erros e limites a tratar no frontend

| Status/situação | Tratamento contratual |
| --- | --- |
| 400 | ID, corpo, variante, formato ou multipart inválido; corrigir request. |
| 401 | Sessão ausente/inválida/expirada; utilizar o fluxo existente de refresh sem loop. |
| 403 | CSRF inválido, papel insuficiente ou edição bloqueada pelo estado. |
| 404 | Publicação/foto inexistente, associação incorreta, propriedade negada ou foto indisponível; detalhes públicos também ocultam pending/rejected. |
| 409 | Conflito de edição/upload, limite de fotos, estado inválido para ação ou refresh concorrente; reconciliar conforme a operação. |
| 413 | Arquivo acima de 5 MiB. |
| 500 | Falha interna; não presumir que uma mutação não persistiu sem reconciliar. |
| 502 | Falha de upload ou entrega remota antes de iniciar o stream. |
| 503 | Serviço de imagens indisponível ou ocupado; excesso de entregas inclui Retry-After. |
| 504 | Timeout de entrega antes de iniciar os headers. |
| Falha depois dos primeiros bytes | A conexão pode encerrar sem novo status ou JSON; tratar falha de carregamento. |

O formato usual de erro é `{ "mensagem": "..." }`; validações podem acrescentar
`erros`. GET de bytes bem-sucedido nunca retorna esse JSON. Limites de entrega:
20 operações simultâneas e 30 segundos no handler por processo, até 8 MiB por
resposta. Autenticação ocorre antes desse handler. Usar concorrência e retry
limitados no cliente, sem presumir disponibilidade ilimitada.

## 8. Diferenças no frontend atual — ainda não implementadas

| Arquivo/fluxo | Situação observada | Integração necessária após revisão |
| --- | --- | --- |
| `src/services/api.js` | Cookies, CSRF e refresh já existem; mensagem de erro espera JSON. | Reutilizar o cliente e tratar erros Blob/refresh concorrente. |
| `src/services/trilhasService.js` | CRUD público básico; não chama consultas próprias, moderação ou fotos. | Acrescentar fluxos confirmados em tarefa de código posterior. |
| `src/services/trilhaPermissoes.js` | Usa autorId/autor._id e permissões opcionais. | Mapear proprietario e estado; não esperar permissões no DTO. |
| `src/components/PostTrilha.jsx` | Usa fotos[0].url diretamente em img. | Resolver origem da API, selecionar miniatura e respeitar null. |
| `src/pages/EditarTrilha.jsx` | Consulta detalhes públicos e inicializa dados básicos. | Consultar detalhes próprios, inicializar detalhes opcionais e limitar payload por estado. |
| `src/services/publicacaoValidation.js` | Omite respostas vazias e sempre prepara campos básicos. | Distinguir criação, limpeza com null e edição de aprovada. |
| `src/pages/CadastroTrilha.jsx` | Criação desativada com aviso de falta de suporte backend. | Conectar criação pending e uploads; textos atuais estão desatualizados. |
| `src/pages/Admin.jsx` | Placeholder informa ausência de fila/decisões. | Conectar fila, fotos privadas, aprovação e rejeição. |
| `src/App.jsx` | /admin usa proteção genérica de sessão. | Refletir perfil admin na navegação/tela, preservando autorização backend. |
| `src/pages/Perfil.jsx` | Publicações e edição do perfil ainda não conectadas. | Usar consultas próprias e endpoints de perfil já existentes. |

Nenhum desses arquivos de código foi alterado nesta consolidação. A documentação
atualizada não habilita criação nem moderação no frontend por si só.

## 9. Pendências de backend e decisões de produto

1. **Detalhes administrativos por ID:** não há endpoint dedicado. Definir se a
   primeira interface usará apenas os dados da fila ou se precisa de consulta
   individual/recarregamento; qualquer endpoint adicional exige definição própria.
2. **Primeiro administrador:** não há provisionamento seguro implementado na API.
   Definir procedimento operacional controlado; cadastro público sempre cria user.
3. **Medalhas e contagem aprovada:** `usuario.trilhasAprovadas` continua proposta
   frontend, não campo retornado pelo backend. Definir onde o servidor fornecerá
   a contagem exclusivamente de approved. Não calcular pelo tamanho do Feed.
4. **Aceite/versionamento:** o frontend envia aceiteTermos, versaoTermos e
   versaoPoliticaPrivacidade; o backend auditado descarta esses campos. Definir e
   implementar validação e persistência atômicas com data do servidor. Sucesso no
   cadastro não comprova registro do aceite.
5. **Acervo legado:** inventariar e definir migração autorizada. Fotos com url null
   continuam indisponíveis e uma cópia authenticated não comprova revogação da origem.
6. **Capa e ordenação:** confirmar se a convenção fotos[0] atende ao produto.
   Reordenação/capa configurável não existem e não devem ser simuladas como persistidas.
7. **Falhas parciais:** definir UX de progresso individual, retentativa e recuperação
   após publicação criada com parte das fotos; o backend não oferece lote atômico.
8. **Produção:** validar com autorização separada Cloudinary authenticated, Atlas
   com transações, CORS/HTTPS/cookies nos navegadores, recursos da hospedagem e
   recuperação do worker. Não há endpoint de saúde nem limitação de login implementados.
9. **Escala das listagens:** se necessário, definir paginação e filtros; eles não
   fazem parte do contrato atual e não podem ser presumidos pelo cliente.

### Medalhas preservadas no frontend

`MedalhaPerfil` recebe `quantidadeAprovada` e opcionalmente `carregando`. Sem contagem
confirmada, preservar integração pendente; não assumir nível zero. As faixas de
`src/data/niveisMedalhas.js` permanecem:

| Medalha | Categoria | Aprovações |
| --- | --- | --- |
| Transparente | Iniciante | 0 |
| Verde | Explorador | 1–15 |
| Bronze | Aventureiro | 16–30 |
| Prata | Desbravador | 31–49 |
| Ouro | Mestre das Trilhas | 50+ |

### Cadastro, documentos e ajuda

O cliente bloqueia cadastro sem aceite e envia as versões de
`src/data/documentosLegais.js`, sem timestamp do cliente. Não retirar esses campos
silenciosamente nem afirmar que foram persistidos. Redirecionamento de sucesso para
login não inicia sessão nem comprova armazenamento do aceite.

As rotas frontend `/ajuda`, `/termos` e `/privacidade` continuam existentes. As
minutas e suas versões exigem revisão antes da publicação; a presente consolidação
não altera os textos legais. Referências já presentes no documento anterior, sem
nova consulta nesta tarefa: [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
e [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares).

## 10. Ordem recomendada e validação futura

1. Revisar e aprovar este contrato e as decisões pendentes.
2. Corrigir autoria, papel administrativo e escolha de consulta por contexto.
3. Integrar leitura pública e privada de imagens, com cancelamento e limpeza de Blobs.
4. Integrar criação/edição por estado e gerenciamento individual de fotos.
5. Integrar fila, decisões administrativas, motivo e reenvio explícito do autor.
6. Completar contratos pendentes e validar os fluxos em ambiente autorizado.

Em tarefa futura de código, testar proprietário/terceiro/admin, três estados,
url null, sessão expirada/revogada, variantes, limites e falhas parciais. Conferir
que aprovada nunca envia campos bloqueados e que limpar respostas envia null.
Validar também caminhos relativos entre origens, erros Blob, cancelamento, revogação
de object URLs, substituição com mesmo fotoId e retorno de rejeição/reenvio.

Esta atualização foi uma análise estática e documental. Não executou build, testes
de aplicação, Git, API, migração, consultas MongoDB/Cloudinary ou serviços externos.
Não reutiliza resultados históricos de testes como evidência de integração atual.
Qualquer implementação de componentes, serviços ou funcionalidades aguarda revisão.
