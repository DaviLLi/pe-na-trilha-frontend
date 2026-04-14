# Pé na Trilha

Aplicação front-end desenvolvida em React com Vite para a disciplina de Desenvolvimento Front-End II.
O projeto simula uma plataforma em que usuários podem publicar trilhas, visualizar postagens no feed e remover publicações quando desejarem.

## Objetivo do Projeto

O sistema foi pensado para organizar e compartilhar experiências de trilhas de forma simples e visual.
A proposta é permitir que um usuário publique informações básicas sobre uma trilha, como:

- título
- descrição
- endereço

Nesta primeira sprint, o foco foi construir a base do projeto em React, aplicar componentização, trabalhar com estados, eventos e deixar a aplicação funcionando no navegador.

## Tema da Aplicação

O tema do projeto é o compartilhamento de trilhas e experiências ao ar livre.
O usuário principal da aplicação é uma pessoa interessada em registrar e visualizar publicações relacionadas a trilhas.

## Tecnologias Utilizadas

- React
- Vite
- JavaScript
- CSS
- ESLint

## Estrutura do Projeto

```text
pe-na-trilha-frontend/
├── pe-na-trilha/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Componentes Principais

### `Header.jsx`
Responsável pelo cabeçalho da aplicação, exibindo a logo e o nome do sistema.

### `Sidebar.jsx`
Exibe as informações do usuário, a quantidade de posts e o botão para criar uma nova publicação.

### `Modal.jsx`
Renderiza o formulário de criação de trilhas.
Usa formulário controlado com `useState` e eventos como `onChange`, `onSubmit` e clique para fechar.

### `PostTrilha.jsx`
Renderiza cada card publicado no feed, mostrando os dados da trilha e a ação de apagar.

### `App.jsx`
Componente principal que centraliza o estado da aplicação e faz a comunicação entre os demais componentes.

## Funcionalidades Implementadas

- aplicação React criada com Vite
- interface organizada em componentes
- abertura e fechamento de modal
- formulário controlado com 3 campos
- criação de novas publicações
- listagem dinâmica dos posts no feed
- exclusão de publicações
- contagem de posts na sidebar
- interface estilizada com CSS próprio
- favicon e título personalizados no navegador

## Conceitos de React Aplicados

- componentização
- props
- `useState`
- `useEffect`
- renderização condicional
- renderização de listas com `map`
- eventos em formulários e botões

## Como Executar o Projeto

### 1. Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO>
```

### 2. Acessar a pasta do projeto

```bash
cd pe-na-trilha-frontend/pe-na-trilha
```

### 3. Instalar as dependências

```bash
npm install
```

### 4. Rodar o projeto em ambiente de desenvolvimento

```bash
npm run dev
```

Depois disso, basta abrir no navegador o endereço exibido pelo Vite, normalmente algo como:

```bash
http://localhost:5173
```

## Outros Scripts Disponíveis

### Build de produção

```bash
npm run build
```

### Pré-visualização do build

```bash
npm run preview
```

### Verificação com ESLint

```bash
npm run lint
```

## Estado Atual da Sprint 1

Nesta etapa, o projeto já atende a base técnica esperada para a Sprint 1:

- aplicação criada com React + Vite
- componentes separados em arquivos `.jsx`
- uso de estado e eventos demonstráveis
- interface funcional rodando no navegador

## Planejamento para a Sprint 2

As próximas evoluções previstas para o projeto são:

- criação de menu de navegação com múltiplas páginas
- persistência de dados com `localStorage`
- tela de login
- criação de usuário
- login com senha

## Integrantes do Grupo

- Davi Martinelli Landal
- Victor Schmitz Alvim de Oliveira
- Hiago Farias Veloso
- Hiuri Machado Cardozo

## Observações

Este projeto está em desenvolvimento incremental para as sprints da disciplina.
Novas funcionalidades serão adicionadas nas próximas etapas conforme os requisitos da atividade.
