import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
// Self-hosted variable font (keeps the app fully offline).
import '@fontsource-variable/hanken-grotesk'
import App from './App'
import { AppProvider } from './store/AppStore'
import './index.css'

// Update on the user's terms — never auto-reload and wipe an in-progress invoice.
const updateSW = registerSW({
  onNeedRefresh() {
    showUpdatePrompt(() => updateSW(true))
  },
})

function showUpdatePrompt(reload: () => void) {
  if (document.getElementById('pwa-update')) return
  const bar = document.createElement('div')
  bar.id = 'pwa-update'
  bar.className = 'pwa-update'
  bar.innerHTML =
    '<span>A new version is available.</span>' +
    '<button id="pwa-reload" class="btn btn--primary btn--sm">Reload</button>' +
    '<button id="pwa-dismiss" class="btn btn--ghost btn--sm" aria-label="Dismiss">Later</button>'
  document.body.appendChild(bar)
  document.getElementById('pwa-reload')?.addEventListener('click', reload)
  document.getElementById('pwa-dismiss')?.addEventListener('click', () => bar.remove())
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)
