import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: './',
    plugins: [
      react(),
      {
        name: 'inject-extension-oauth',
        closeBundle() {
          const manifestPath = resolve(__dirname, 'dist/manifest.json')
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
          const clientId = env.VITE_GOOGLE_OAUTH_CLIENT_ID

          if (clientId) {
            manifest.oauth2 = {
              client_id: clientId,
              scopes: ['openid', 'email', 'profile'],
            }
          }

          writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
        },
      },
    ],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          sidepanel: resolve(__dirname, 'sidepanel.html'),
          embed: resolve(__dirname, 'embed.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})
