# Melhorias do frontend e contratos pendentes

Implementação de 12/11/2026. Apenas o frontend foi alterado. As propostas abaixo
não comprovam suporte no backend: precisam ser acordadas e testadas com a API real.

## Publicação

As dez perguntas são opcionais, cada uma conserva três opções e tem ação de limpar.
Trocar ou limpar `tipoLocal` limpa `caracteristicaPrincipal`. Respostas vazias são
omitidas do payload. Título, descrição e localização continuam obrigatórios para
preservar o contrato básico documentado; espaços em branco não satisfazem a validação.

Formato proposto para os detalhes (não enviado enquanto a criação estiver bloqueada):

```json
{
  "titulo": "Título informado pelo usuário",
  "descricao": "Descrição informada pelo usuário",
  "endereco": "Localização informada pelo usuário",
  "duracao": { "horas": 2, "minutos": 30 }
}
```

`duracao` é `null` quando não preenchida. Quando informada, exige inteiros: horas
0–23, minutos 0–59 e total positivo. Os controles não fazem rollover. Limpar volta
a `null`; diminuir até 00:00 exige escolher um tempo positivo ou limpar antes do envio.
O Feed preserva a leitura da duração antiga em texto e aceita o novo objeto.

Os campos opcionais são `tipoLocal`, `dificuldade`, `condicaoCaminho`, `sinalizacao`,
`estacionamento`, `banheiro`, `alimentacao`, `estruturaBanho`, `acesso` e
`caracteristicaPrincipal`. As opções aprovadas permanecem em `src/data/detalhesTrilha.js`.

A API precisa persistir esses campos e devolvê-los nas consultas, derivar a autoria
da sessão e criar registros pendentes. A listagem pública deve excluir pendentes e
rejeitados. Aprovação, rejeição, upload e a política de nova aprovação após edição
continuam pendentes. A criação permanece desativada e não há upload fictício.
Consulta, atualização básica e exclusão mantêm seus serviços existentes.

## Permissões de edição e exclusão

O cliente considera um usuário autenticado com `_id` e uma publicação com:

- `permissoes.editar` / `permissoes.excluir`: booleanos explícitos, prioritários;
- na ausência de uma permissão explícita, `autorId` ou `autor._id` igual ao `_id`
  da conta habilita a respectiva ação.

Sem autoria/permissões, os controles ficam ocultos e a tela de edição não abre o
formulário. Uma negativa explícita prevalece sobre a autoria. Não se presume papel
administrativo a partir de dados ausentes. O contrato precisa ser confirmado: se a
API usa outros nomes, adaptar este mapeamento. Todos os GET/PUT/DELETE e endpoints
administrativos precisam de autorização real no backend; ocultar botões não protege dados.

A confirmação de exclusão é nativa, identifica a publicação e avisa que é permanente.

## Medalhas

`MedalhaPerfil` recebe `quantidadeAprovada` e, opcionalmente, `carregando`.
O Perfil está preparado para `usuario.trilhasAprovadas`, inteiro não negativo
retornado pelo login/refresh ou `/usuarios/me`. Esse é um contrato proposto;
nenhum novo endpoint foi inventado ou chamado. Sem esse dado, aparece a mensagem
de integração pendente, nunca a medalha Transparente por padrão.

O servidor deve contar exclusivamente publicações aprovadas da conta, sem usar
o tamanho do Feed, pendentes ou rejeitadas. O cálculo e o guia compartilham
`src/data/niveisMedalhas.js`:

| Medalha | Categoria | Aprovações |
| --- | --- | --- |
| Transparente | Iniciante | 0 |
| Verde | Explorador | 1–15 |
| Bronze | Aventureiro | 16–30 |
| Prata | Desbravador | 31–49 |
| Ouro | Mestre das Trilhas | 50+ |

O progresso mede a faixa entre o mínimo do nível atual e o mínimo do próximo.
Ouro é o nível máximo. As cinco artes originais não foram alteradas.

## Cadastro e aceite

O checkbox inicia desmarcado. O frontend bloqueia o envio sem aceite. Os links
abrem documentos em novas abas, preservando o preenchimento. O cadastro existente
continua usando `POST /usuarios`, agora com os campos adicionais propostos:

```json
{
  "aceiteTermos": true,
  "versaoTermos": "2026-11-12.1",
  "versaoPoliticaPrivacidade": "2026-11-12.1"
}
```

Os quatro campos de conta existentes continuam no corpo. Não há timestamp do cliente.
A API deve validar versões e aceite, persistir o registro junto da criação do usuário
e atribuir data e hora no servidor. Recomenda-se uma resposta explícita confirmando
as versões registradas. Não realizar uma criação parcial seguida de falha ao salvar aceite.

**O frontend envia a intenção, mas não comprova que a API grava o aceite.** Uma API
que ignore campos extras pode criar a conta sem registrar o aceite. Uma API estrita
pode recusar o cadastro até suportar o novo contrato; o cliente mantém os campos e
mostra erro, sem retirar silenciosamente os metadados e tentar de novo.

O redirecionamento para `/login` e a mensagem de sucesso só ocorrem após resolução
bem-sucedida do cadastro. Não se afirma na mensagem que o aceite foi persistido.
O aceite é contratual dos termos; a versão da política identifica a informação
apresentada, sem consentimento genérico obrigatório para tratamentos de dados.

## Documentos e ajuda

Novas rotas públicas: `/ajuda`, `/termos` e `/privacidade`.
A Central de Ajuda explica recursos atuais e identifica fluxos ainda indisponíveis.
Os documentos são minutas específicas do projeto, sem validação jurídica. Antes da
publicação oficial, preencher controlador, canal para direitos, encarregado quando
aplicável, bases legais, retenção, fornecedores, transferências e práticas reais
de proteção. Cada alteração relevante no documento exige revisão da versão.

Referências consultadas:

- [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [ANPD — direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)

## Validação

Na pasta `pe-na-trilha`, executar `npm run lint`, `npm test`, `npm run test:auth`
e `npm run build`. Os testes de regras usam respostas simuladas, sem servidor real.
Eles cobrem perguntas opcionais, limpeza e dependência entre respostas, duração,
fronteiras das medalhas, permissões e o fluxo de cadastro/aceite/redirecionamento.

Resultado nesta implementação: lint, build e `git diff --check` passaram. Os seis
arquivos de teste contêm 26 casos, todos aprovados, incluindo os 12 casos existentes
de autenticação. Também foram realizadas 11 verificações no Chrome headless com API
simulada exclusivamente em memória: perguntas, limpeza, duração e teclado, ausência
de overflow em 360/768/1440 px, estados da medalha, confirmação de exclusão,
bloqueio sem aceite, retenção de dados após erro e sucesso seguido de login.
Não houve validação com cookies ou dados reais do backend.

## Arquivos desta implementação

Todos os caminhos abaixo, exceto documentação, são relativos a `pe-na-trilha/`.

| Área | Arquivos criados ou alterados |
| --- | --- |
| Rotas e navegação | `src/App.jsx`, `src/components/Sidebar.jsx` |
| Publicação e duração | `src/components/TrilhaForm.jsx`, `src/components/DuracaoSeletor.jsx`, `src/components/DetalhesTrilha.jsx`, `src/services/publicacaoValidation.js` |
| Medalhas e perfil | `src/components/MedalhaPerfil.jsx`, `src/data/niveisMedalhas.js`, `src/pages/Perfil.jsx`, `src/pages/GuiaMedalhas.jsx` |
| Ajuda e documentos | `src/pages/Ajuda.jsx`, `src/pages/DocumentoLegal.jsx`, `src/data/documentosLegais.js` |
| Cadastro | `src/pages/CadastroUsuario.jsx`, `src/services/authValidation.js`, `src/services/cadastroFlow.js` |
| Permissões e exclusão | `src/components/PostTrilha.jsx`, `src/pages/ListaTrilhas.jsx`, `src/pages/EditarTrilha.jsx`, `src/services/trilhaPermissoes.js` |
| Estilos | `src/styles/community.css`, `src/styles/product.css`, `src/styles/style.css` |
| Testes e scripts | `package.json`, `tests/authValidation.test.js`, `tests/cadastroFlow.test.js`, `tests/medalhas.test.js`, `tests/publicacao.test.js`, `tests/trilhaPermissoes.test.js` |
| Documentação no repositório | `README.md`, `docs/integracao-frontend.md` |

Nenhuma arte de medalha, dependência, lockfile ou serviço de CRUD foi alterado.
Não houve alteração do backend, commit, push, merge ou troca de branch.
