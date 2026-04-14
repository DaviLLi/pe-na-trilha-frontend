// Importa o modo estrito do React.
// Ele ajuda a identificar práticas problemáticas durante o desenvolvimento.
import { StrictMode } from 'react'

// Importa a função que cria a raiz da aplicação React no HTML.
import { createRoot } from 'react-dom/client'

// Importa estilos globais iniciais.
import './index.css'

// Importa o componente principal da aplicação.
import App from './App.jsx'

// Aqui o React "entra" dentro da div com id="root" do index.html.
// A partir desse ponto, toda a interface passa a ser renderizada pelo React.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Componente principal que organiza toda a tela */}
    <App />
  </StrictMode>,
)
