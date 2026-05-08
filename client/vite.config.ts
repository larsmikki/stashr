import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: 'public',
  server: {
    port: 3010,
    proxy: {
      '/api': 'http://localhost:3011',
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
