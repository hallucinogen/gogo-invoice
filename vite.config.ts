import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// Project page lives at https://hallucinogen.github.io/gogo-invoice/
// so every asset must be served from the /gogo-invoice/ base path.
const BASE = '/gogo-invoice/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png', 'llms.txt'],
      manifest: {
        name: 'Gogo Invoice',
        short_name: 'Invoice',
        description:
          'Offline-first invoice generator. No backend — your data stays on your device.',
        theme_color: '#1d5b48',
        background_color: '#efe7d6',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // @react-pdf/renderer ships large chunks; lift the precache size cap.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
})
