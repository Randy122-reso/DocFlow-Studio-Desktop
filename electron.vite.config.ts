import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

const DEV_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws://127.0.0.1:5173 http://127.0.0.1:5173; object-src 'none'; base-uri 'self'; form-action 'none'"
const PROD_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: { main: resolve(__dirname, 'electron/main.ts') }
      }
    }
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: { preload: resolve(__dirname, 'electron/preload.ts') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, 'src/index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'docflow-csp',
        transformIndexHtml(html, context) {
          const csp = context.server ? DEV_CSP : PROD_CSP
          return html.replace('__DOCFLOW_CSP__', csp)
        }
      }
    ],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true
    }
  }
})
