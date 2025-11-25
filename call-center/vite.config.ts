import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@apps': path.resolve(__dirname, './src/apps'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        // Admin app (default)
        admin: resolve(__dirname, 'index.html'),
        // Standalone softphone app
        softphone: resolve(__dirname, 'softphone.html'),
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})