import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Use root path on Cloudflare Pages (pages.dev), subdirectory on GitHub Pages
const isCloudflare = window.location.hostname.endsWith('.pages.dev') ||
                     !window.location.hostname.includes('github.io')
const basename = isCloudflare ? '/' : '/wc2026-predictor'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
