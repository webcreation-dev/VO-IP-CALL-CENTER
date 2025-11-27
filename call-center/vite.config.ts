import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { resolve } from 'path'
import fs from 'fs'

// SSL certificate paths (Let's Encrypt)
const SSL_CERT_PATH = '/etc/letsencrypt/live/pishon.kabou.bj/fullchain.pem'
const SSL_KEY_PATH = '/etc/letsencrypt/live/pishon.kabou.bj/privkey.pem'

// Check if SSL certificates exist
const sslEnabled = fs.existsSync(SSL_CERT_PATH) && fs.existsSync(SSL_KEY_PATH)

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
    // Enable HTTPS if certificates are available
    ...(sslEnabled && {
      https: {
        cert: fs.readFileSync(SSL_CERT_PATH),
        key: fs.readFileSync(SSL_KEY_PATH),
      },
    }),
  },
})