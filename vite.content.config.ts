import { defineConfig } from 'vite'
import { resolve } from 'path'

/** Lightweight content-script bundle: DOM injection + iframe only. */
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/content.ts'),
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
