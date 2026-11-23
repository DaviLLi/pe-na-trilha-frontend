# Pe na Trilha

Projeto academico full stack para cadastro e gerenciamento de trilhas. A aplicacao e dividida em um frontend React com Vite e uma API REST em Node.js, responsavel pela persistencia dos dados no banco.

> Estado atual do frontend: autenticação por cookies, perguntas opcionais, seletor de duração,
> Central de Ajuda, documentos e aceite no cadastro estão implementados. Publicação, aprovação
> e contagem de medalhas ainda dependem de contratos com a API. Consulte
> [contratos e limitações da integração](docs/integracao-frontend.md) antes de usar as instruções históricas abaixo.

## Tecnologias

Frontend:

- React
- Vite
- React Router
- Axios
- CSS

Backend:

- Node.js
- Express
- MongoDB com Mongoose
- CORS
- Dotenv

## Funcionalidades

- Listagem de trilhas cadastradas.
- Cadastro de nova trilha.
- Edicao de trilha existente.
- Exclusao de trilha.
- Busca de trilha por ID para preenchimento do formulario de edicao.
- Mensagens de carregamento e erro quando a API nao responde.
- Navegacao entre paginas com React Router.

Cada trilha possui os seguintes campos:

```json
{
  "titulo": "Nome da trilha",
  "descricao": "Descricao da trilha",
  "endereco": "Localizacao da trilha"
}
```

## Estrutura do projeto

```text
pe-na-trilha-frontend/
├── pe-na-trilha/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── pe-na-trilha-backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── README.md
```

## Rotas do frontend

| Rota                  | Pagina                 |
| --------------------- | ---------------------- |
| `/`                   | Pagina inicial         |
| `/trilhas`            | Lista de trilhas       |
| `/trilhas/nova`       | Cadastro de trilha     |
| `/trilhas/:id/editar` | Edicao de trilha       |
| `/sobre`              | Sobre o projeto        |
| `/sprint-3`           | Apresentacao da sprint |

## Rotas da API

| Metodo   | Rota           | Acao                        |
| -------- | -------------- | --------------------------- |
| `GET`    | `/trilhas`     | Lista todas as trilhas      |
| `GET`    | `/trilhas/:id` | Busca uma trilha especifica |
| `POST`   | `/trilhas`     | Cadastra uma nova trilha    |
| `PUT`    | `/trilhas/:id` | Atualiza uma trilha         |
| `DELETE` | `/trilhas/:id` | Remove uma trilha           |

## Como executar

Instale as dependências com `npm ci` na pasta do backend e em `pe-na-trilha/` neste repositório. Use o mesmo comando de ambiente em cada terminal.

| Ambiente | Comando nos dois projetos | Frontend | API |
| --- | --- | --- | --- |
| Produção local | `npm run dev:production` | `http://localhost:5173` | `http://localhost:3000` |
| Homologação | `npm run dev:homologation` | `http://127.0.0.1:5174` | `http://127.0.0.1:3001` |

O frontend local já seleciona o endereço correspondente. Para a Vercel, defina `VITE_API_URL` com a origem HTTPS real do backend de produção e use `npm run build` em `pe-na-trilha/`. Para executar o mesmo build localmente, use `pe-na-trilha/.env.production`. A URL entra no bundle público. Mantenha credenciais somente no backend.

Use `npm run build:homologation` para um bundle voltado à API local de homologação. `npm test` e `npm run lint` executam as verificações do frontend.

## Integracao entre front e back

O frontend centraliza a configuracao da API em:

```text
pe-na-trilha/src/services/api.js
```

As chamadas para as rotas de trilhas ficam em:

```text
pe-na-trilha/src/services/trilhasService.js
```

Esse arquivo usa o cliente Axios para chamar:

```js
GET /trilhas
GET /trilhas/:id
POST /trilhas
PUT /trilhas/:id
DELETE /trilhas/:id
```

## Organizacao do codigo

- `pe-na-trilha/src/pages`: paginas principais da aplicacao.
- `pe-na-trilha/src/components`: componentes reutilizaveis.
- `pe-na-trilha/src/services`: comunicacao com a API.
- `pe-na-trilha/src/styles`: arquivos de estilo.
- `pe-na-trilha-backend/src/routes`: definicao das rotas da API.
- `pe-na-trilha-backend/src/controllers`: regras das operacoes de CRUD.
- `pe-na-trilha-backend/src/models`: schemas do banco de dados.
- `pe-na-trilha-backend/src/config`: configuracoes de conexao.
- `pe-na-trilha-backend/src/middlewares`: validacoes e tratamento de erros.

## Observacoes

- O backend deve estar rodando antes de usar as telas de cadastro, listagem, edicao e exclusao.
- O CORS do backend deve permitir a origem do frontend, normalmente `http://localhost:5173`.
- O frontend possui autenticação preparada para cookies HttpOnly; o funcionamento depende da API. Upload de imagens, comentários e avaliações não estão implementados na interface.

## Desenvolvido

- Davi Martinelli Landal
