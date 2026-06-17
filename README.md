# Pe na Trilha

Projeto academico full stack para cadastro e gerenciamento de trilhas. A aplicacao e dividida em um frontend React com Vite e uma API REST em Node.js, responsavel pela persistencia dos dados no banco.

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

| Rota | Pagina |
| --- | --- |
| `/` | Pagina inicial |
| `/trilhas` | Lista de trilhas |
| `/trilhas/nova` | Cadastro de trilha |
| `/trilhas/:id/editar` | Edicao de trilha |
| `/sobre` | Sobre o projeto |
| `/sprint-3` | Apresentacao da sprint |

## Rotas da API

| Metodo | Rota | Acao |
| --- | --- | --- |
| `GET` | `/trilhas` | Lista todas as trilhas |
| `GET` | `/trilhas/:id` | Busca uma trilha especifica |
| `POST` | `/trilhas` | Cadastra uma nova trilha |
| `PUT` | `/trilhas/:id` | Atualiza uma trilha |
| `DELETE` | `/trilhas/:id` | Remove uma trilha |

## Como configurar

### Frontend

Crie um arquivo `.env` dentro da pasta `pe-na-trilha`:

```env
VITE_API_URL=http://localhost:3000
```

Essa variavel define o endereco da API usada pelo Axios. Se ela nao existir, o frontend usa `http://localhost:3000` por padrao.

### Backend

Crie um arquivo `.env` dentro da pasta `pe-na-trilha-backend`:

```env
PORT=3000
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/pe-na-trilha
FRONTEND_URL=http://localhost:5173
```

Substitua `MONGO_URI` pela string real do seu banco MongoDB. Nao envie arquivos `.env` com credenciais para o repositorio.

## Como executar

### Backend

Em um terminal:

```bash
cd pe-na-trilha-backend
npm install
npm run dev
```

A API ficara disponivel em:

```text
http://localhost:3000
```

### Frontend

Em outro terminal:

```bash
cd pe-na-trilha
npm install
npm run dev
```

O Vite mostrara o endereco local do frontend, normalmente:

```text
http://localhost:5173
```

## Scripts

Frontend:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Backend:

```bash
npm run dev
npm start
```

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
- O projeto nao possui autenticacao, upload de imagens, comentarios ou avaliacoes.

## Integrantes

- Davi Martinelli Landal
- Victor Schmitz Alvim de Oliveira
- Hiago Farias Veloso
- Hiuri Machado Cardozo
