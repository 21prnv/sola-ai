import { resolve } from 'path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  envDir: resolve(__dirname, '../..'),
  cacheDir: resolve(__dirname, '../../node_modules/.vite/sola-ai'),
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  server: {
    port: 5173,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4300,
    host: 'localhost',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      buffer: 'buffer/',
    },
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    // Skip gzip reporting to reduce peak memory on large dependency graphs.
    reportCompressedSize: false,
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}))
