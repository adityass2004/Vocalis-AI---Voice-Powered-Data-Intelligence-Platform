import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Allow overriding host/HMR via env (useful in Docker / WSL)
const DEV_HOST = process.env.VITE_DEV_HOST || '0.0.0.0'
const HMR_HOST = process.env.VITE_HMR_HOST || 'localhost'
const DEV_PORT = Number(process.env.VITE_DEV_PORT) || 3000

export default defineConfig({
  plugins: [react()],
  server: {
    host: DEV_HOST, // expose for container access
    port: DEV_PORT,
    hmr: {
      host: HMR_HOST, // browser connects to this host
      port: DEV_PORT,
      protocol: 'ws'
    },
    // File watching tweaks for Docker/WSL (prevents missed updates + fixes some WS timeout issues)
    watch: {
      usePolling: true,
      interval: 300
    }
  },
  build: {
    outDir: 'dist'
  }
})
