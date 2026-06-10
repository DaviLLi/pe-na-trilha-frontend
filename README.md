# Pé na Trilha - Sprint 3

Projeto acadêmico full stack para cadastro e gerenciamento de trilhas. Nesta
sprint, a persistência em `localStorage` foi substituída por uma API REST com
MongoDB Atlas.

## Tecnologias

### Frontend

- React com Vite
- React Router
- Axios
- CSS

### Backend

- Node.js
- Express
- Mongoose
- Cors
- Dotenv
- MongoDB Atlas

## Funcionalidades

- Listar todas as trilhas.
- Buscar uma trilha para edição.
- Cadastrar uma trilha.
- Editar uma trilha.
- Excluir uma trilha.
- Exibir mensagens de carregamento e erro.
- Navegar entre as páginas com React Router.

Cada trilha possui somente os campos:

```json
{
  "titulo": "String",
  "descricao": "String",
  "endereco": "String"
}
```

O projeto não possui autenticação, usuários, comentários, avaliações ou upload
de imagens.

## Estrutura

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
│   └── package.json
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

## Rotas da API

| Método | Rota | Ação |
| --- | --- | --- |
| `GET` | `/trilhas` | Lista todas as trilhas |
| `GET` | `/trilhas/:id` | Busca uma trilha |
| `POST` | `/trilhas` | Cadastra uma trilha |
| `PUT` | `/trilhas/:id` | Atualiza uma trilha |
| `DELETE` | `/trilhas/:id` | Exclui uma trilha |

## Configuração do MongoDB Atlas

1. Crie um cluster no MongoDB Atlas.
2. Crie um usuário de banco de dados.
3. Autorize seu endereço IP em **Network Access**.
4. Copie a string de conexão do cluster.
5. No arquivo `pe-na-trilha-backend/.env`, substitua o valor de exemplo:

```env
PORT=3000
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/penatrilha
FRONTEND_URL=http://localhost:5173
```

Não publique o arquivo `.env` nem credenciais reais no repositório.

## Como executar o backend

Em um terminal:

```bash
cd pe-na-trilha-backend
npm install
npm run dev
```

A API ficará disponível em:

```text
http://localhost:3000
```

## Como executar o frontend

Em outro terminal:

```bash
cd pe-na-trilha
npm install
npm run dev
```

O frontend ficará disponível normalmente em:

```text
http://localhost:5173
```

Por padrão, o frontend acessa `http://localhost:3000`. Para usar outro endereço,
crie `pe-na-trilha/.env` com:

```env
VITE_API_URL=http://localhost:3000
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

## Organização do código

- `src/pages`: telas associadas às rotas do frontend.
- `src/components`: componentes visuais reutilizáveis.
- `src/services`: cliente Axios e operações da API.
- `src/models/Trilha.js`: schema Mongoose da entidade.
- `src/controllers/trilhaController.js`: regras do CRUD.
- `src/routes/trilhaRoutes.js`: definição das rotas REST.
- `src/config/database.js`: conexão isolada com MongoDB.
- `src/middlewares/errorHandler.js`: respostas básicas de erro.

## Integrantes do grupo

- Davi Martinelli Landal
- Victor Schmitz Alvim de Oliveira
- Hiago Farias Veloso
- Hiuri Machado Cardozo
