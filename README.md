# Pé na Trilha

Aplicação front-end desenvolvida em React com Vite para a disciplina de Desenvolvimento Front-End II.

O projeto simula uma plataforma em que usuários podem publicar trilhas, visualizar postagens no feed, remover publicações e manter os dados salvos no navegador.

## Objetivo do Projeto

O sistema foi pensado para organizar e compartilhar experiências de trilhas de forma simples e visual. A proposta é permitir que um usuário publique informações básicas sobre uma trilha, como título, descrição e endereço.

Na Sprint 2, o projeto evoluiu para um mini aplicativo React com navegação entre páginas, formulário controlado, listagem dinâmica e persistência com `localStorage`.

## Tecnologias Utilizadas

- React
- Vite
- JavaScript
- CSS
- ESLint
- localStorage

## Funcionalidades Implementadas

- Aplicação React criada com Vite.
- Menu de navegação com 3 páginas: Trilhas, Sobre e Sprint 2.
- Interface organizada em componentes.
- Abertura e fechamento de modal.
- Formulário controlado com `useState`.
- Cadastro com 3 campos obrigatórios: título, descrição e endereço.
- Criação de novas publicações.
- Listagem dinâmica dos posts no feed.
- Exclusão de publicações.
- Contagem de posts na sidebar.
- Persistência dos posts com `localStorage`.
- Serviço separado para regras de armazenamento em `src/services/postsStorage.js`.
- Tratamento visual para erro de armazenamento local.
- README atualizado com instruções de execução.

## Estrutura do Projeto

```text
pe-na-trilha-frontend/
├── pe-na-trilha/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── About.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── PostTrilha.jsx
│   │   │   ├── Presentation.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── services/
│   │   │   └── postsStorage.js
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Organização Principal

- `src/App.jsx`: controla navegação, estado principal dos posts e modal.
- `src/components/Header.jsx`: topo e menu de navegação.
- `src/components/Sidebar.jsx`: perfil lateral e botão de novo post.
- `src/components/Modal.jsx`: formulário controlado de cadastro.
- `src/components/PostTrilha.jsx`: card de cada post cadastrado.
- `src/components/About.jsx`: página sobre o problema, solução e nicho.
- `src/components/Presentation.jsx`: roteiro da apresentação da Sprint 2.
- `src/services/postsStorage.js`: leitura e gravação dos posts no `localStorage`.
- `src/styles`: arquivos CSS separados por responsabilidade.

## Como Executar o Projeto

```bash
cd pe-na-trilha
npm install
npm run dev
```

Depois, abra no navegador o endereço exibido pelo Vite, normalmente:

```bash
http://localhost:5173
```

## Scripts Disponíveis

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Roteiro Sugerido para Apresentação

1. Apresentar o título e o tema do app: Pé na Trilha.
2. Mostrar a organização dos componentes no código.
3. Demonstrar a navegação entre as 3 páginas.
4. Cadastrar uma trilha usando o formulário.
5. Mostrar a listagem dinâmica atualizando em tempo real.
6. Recarregar a página e mostrar que os dados continuam salvos.
7. Comentar dificuldades e aprendizados da Sprint 2.

## Integrantes do Grupo

- Davi Martinelli Landal
- Victor Schmitz Alvim de Oliveira
- Hiago Farias Veloso
- Hiuri Machado Cardozo
