import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// VITE_BASE_PATH is set to /wc2026-predictor in GitHub Actions
// On Cloudflare Pages it is not set, so defaults to /
const basename = import.meta.env.VITE_BASE_PATH || '/'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
