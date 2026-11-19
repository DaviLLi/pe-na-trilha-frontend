# CI/CD do Pé na Trilha

## Integração contínua

A CI valida cada push em `main` ou `develop` e cada pull request direcionado a uma dessas branches. Em ambos os repositórios, o GitHub Actions baixa o código, prepara Node.js 22 LTS e instala as dependências com `npm ci` e o lockfile do projeto.

| Repositório | Diretório de execução | Validações |
| --- | --- | --- |
| Frontend | `pe-na-trilha/` | `npm run lint`, a suíte completa de `npm test` executada em série e `npm run build` |
| Backend | Raiz do repositório | `npm run lint` e `npm test -- --runInBand`, com cobertura do Jest |

O frontend usa o Chrome pré-instalado no runner para os testes de navegador. A etapa falha se o executável estiver ausente, para que esses testes sempre sejam executados. A suíte externa do backend (`npm run test:integration`) continua opt-in e requer MongoDB e Cloudinary dedicados a testes.

## Como demonstrar no GitHub

1. Após publicar a branch de trabalho, abra um pull request para `develop` em cada repositório. Esse procedimento testa a CI sem atualizar `main`.
2. Na aba **Checks** do PR ou na aba **Actions** do repositório, abra a execução **CI**. Confira o resultado de cada etapa do job **Validar frontend** ou **Validar backend**.
3. No GitHub, o responsável pelo repositório pode exigir o check correspondente na proteção de `main` e exigir pull request para essa branch. Assim, o merge depende da validação.

## Entrega e implantação

O build do frontend mostra que o projeto está pronto para ser publicado. A implantação acontece nos provedores de hospedagem. Os workflows locais executam a CI e não acionam deploy. As configurações dos painéis da Vercel e do Render precisam ser confirmadas por quem administra os serviços.

- **Vercel.** Confirme o repositório vinculado e a branch de produção (`main` é a branch padrão observada no GitHub local). Use `pe-na-trilha` como diretório raiz, `npm run build` e saída `dist`. Configure `VITE_API_URL` com a URL HTTPS da API. Se a produção for o único ambiente permitido, selecione **Only build production**. Use **Deployment Checks**, quando disponíveis, para exigir **Validar frontend** antes da promoção. Caso essa opção esteja indisponível, proteja `main` com o check obrigatório e use promoção manual somente após conferir a CI do commit. [Settings da Vercel](https://vercel.com/docs/project-configuration/project-settings) · [Deployment Checks](https://vercel.com/docs/deployment-checks)
- **Render e MongoDB Atlas.** Confirme a branch de produção do serviço e selecione **After CI Checks Pass** para condicionar o deploy ao resultado da CI. As credenciais do Atlas e as demais configurações privadas pertencem ao ambiente do serviço no Render. [Deploys no Render](https://render.com/docs/deploys)

A CI não exige secrets no GitHub. A conexão nativa dos provedores ao GitHub é configurada nos respectivos painéis. `VITE_API_URL` é uma variável pública do frontend. Mantenha as credenciais de produção do backend exclusivamente no Render.
