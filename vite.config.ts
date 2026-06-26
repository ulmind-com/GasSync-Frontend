import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/maps-api': {
        target: 'https://maps.googleapis.com/maps/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maps-api/, '')
      },
      '/api/v1': {
        target: 'https://gassync-backend.onrender.com',
        changeOrigin: true
      }
    }
  }
})
