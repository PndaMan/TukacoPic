import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ["medline-permit-vector-ppm.trycloudflare.com", "decor-walk-period-cloudy.trycloudflare.com"]
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})