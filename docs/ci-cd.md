# CI/CD do Pé na Trilha

## Integração contínua

A CI valida cada push em `main` ou `develop` e cada pull request direcionado a uma dessas branches. Em ambos os repositórios, o GitHub Actions baixa o código, prepara Node.js 22 LTS e instala as dependências com `npm ci` e o lockfile do projeto.

| Repositório | Diretório de execução | Validações |
| --- | --- | --- |
| Frontend | `pe-na-trilha/` | `npm run lint`, a suíte completa de `npm test` executada em série e builds de produção e homologação com origens sintéticas |
| Backend | Raiz do repositório | `npm run lint` e `npm test -- --runInBand`, com cobertura do Jest |

O frontend usa o Chrome pré-instalado no runner para os testes de navegador. A etapa falha se o executável estiver ausente, para que esses testes sempre sejam executados. A suíte externa do backend (`npm run test:integration`) continua opt-in e requer MongoDB e Cloudinary dedicados a testes.

## Como demonstrar no GitHub

1. Após publicar a branch de trabalho, abra um pull request para `develop` em cada repositório. Esse procedimento testa a CI sem atualizar `main`.
2. Na aba **Checks** do PR ou na aba **Actions** do repositório, abra a execução **CI**. Confira o resultado de cada etapa do job **Validar frontend** ou **Validar backend**.
3. No GitHub, o responsável pelo repositório pode exigir o check correspondente na proteção de `main` e exigir pull request para essa branch. Assim, o merge depende da validação.

## Entrega e implantação

A implantação acontece nos provedores de hospedagem. O workflow valida os builds e as configurações de implantação são administradas nos painéis da Vercel e do Render.

- **Vercel.** Confirme o repositório vinculado e a branch de produção (`main` é a branch padrão observada no GitHub local). Use `pe-na-trilha` como diretório raiz e `dist` como saída. Configure o comando de cada ambiente conforme a tabela abaixo. Se a produção for o único ambiente permitido, selecione **Only build production**. Use **Deployment Checks**, quando disponíveis, para exigir **Validar frontend** antes da promoção. Caso essa opção esteja indisponível, proteja `main` com o check obrigatório e use promoção manual somente após conferir a CI do commit. [Settings da Vercel](https://vercel.com/docs/project-configuration/project-settings) · [Deployment Checks](https://vercel.com/docs/deployment-checks)
- **Render e MongoDB Atlas.** Confirme a branch de produção do serviço e selecione **After CI Checks Pass** para condicionar o deploy ao resultado da CI. As credenciais do Atlas e as demais configurações privadas pertencem ao ambiente do serviço no Render. [Deploys no Render](https://render.com/docs/deploys)

### Modos do frontend

| Modo | Comando em `pe-na-trilha/` | Valor de `VITE_API_URL` |
| --- | --- | --- |
| Desenvolvimento (`development`) | `npm run dev` | Origem HTTP ou HTTPS da API de desenvolvimento. Pode ser definida em `.env.local` a partir de `.env.example`. |
| Produção (`production`) | `npm run build` | Origem HTTPS idêntica a `PNT_API_ORIGIN_PRODUCTION`. |
| Homologação (`homologation`) | `npm run dev -- --mode homologation` ou `npm run build:homologation` | Origem idêntica a `PNT_API_ORIGIN_HOMOLOGATION`. Aceita HTTPS em domínio não local ou HTTP em `localhost` e `127.0.0.1`. |

Os dois builds de distribuição exigem também `PNT_API_ORIGIN_PRODUCTION` e `PNT_API_ORIGIN_HOMOLOGATION`. Cadastre essas origens esperadas com os mesmos valores nos dois ambientes de build e selecione `VITE_API_URL` individualmente em cada ambiente. Elas devem representar as APIs autorizadas em domínios distintos. Configure as três variáveis no provedor ou em `.env.production` e `.env.homologation` locais, conforme o modo. As variáveis fornecidas pelo processo têm precedência sobre os arquivos `.env`.

Para usar a API local em homologação, defina `VITE_API_URL` e `PNT_API_ORIGIN_HOMOLOGATION` com o mesmo valor, por exemplo `http://localhost:3000`, em `.env.homologation.local`. Mantenha `PNT_API_ORIGIN_PRODUCTION` configurada com sua origem HTTPS. Na hospedagem, use a origem HTTPS da API de homologação. O build em modo `production` continua exigindo HTTPS em domínios distintos e não locais para ambas as origens esperadas.

Use apenas origens, sem caminho, parâmetros, fragmento ou credenciais. A validação depende do cadastro correto das duas origens pelo responsável pela hospedagem. `VITE_API_URL` fica no JavaScript público. As variáveis `PNT_API_ORIGIN_*` são usadas no build, e as credenciais pertencem ao backend.

### Limite de login e CORS

O backend retorna `Retry-After` no `429` do login. Para o navegador ler esse header entre origens, a configuração CORS do backend deve expor `Retry-After` por meio de `exposedHeaders: ["Retry-After"]`, preservando os demais headers expostos e a lista de origens permitidas. Até essa configuração entrar em vigor, o frontend usa a janela máxima atual do limitador, de cinco minutos, quando o header estiver indisponível. Valide na homologação se o contador começa no valor efetivamente recebido.
