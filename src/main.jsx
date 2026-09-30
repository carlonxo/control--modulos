import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import manifestUrl from './push-manifest.webmanifest?url&no-inline'

const manifest = document.createElement('link')
manifest.rel = 'manifest'
manifest.href = manifestUrl
document.head.appendChild(manifest)

const colorTema = document.createElement('meta')
colorTema.name = 'theme-color'
colorTema.content = '#0c2733'
document.head.appendChild(colorTema)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
