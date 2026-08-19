import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// The AI Studio code might have expected 'app-root' or standard 'root'. 
// We will look for 'app-root' first, fallback to 'root'.
const rootElement = document.getElementById('app-root') || document.getElementById('root');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)