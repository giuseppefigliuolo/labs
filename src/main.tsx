import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CONFIG, TITLE_FONTS } from './config'
import './styles.css'

// Heading font is a design knob, so load only the one in use.
const google = TITLE_FONTS[CONFIG.titleFont].google
if (google) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${google}&display=swap`
  document.head.appendChild(link)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
