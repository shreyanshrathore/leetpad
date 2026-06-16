import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/** Self-contained content-script bundle (no ES module imports). */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/content.tsx'),
      output: {
        format: 'iife',
        name: 'LCWhiteboardContent',
        entryFileNames: 'content.js',
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? ''
          if (name.endsWith('.css')) return 'content.css'
          return 'assets/[name][extname]'
        },
      },
    },
  },
})
