import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// En développement, les appels /api sont redirigés vers le backend.
// Adaptez BACKEND_URL (fichier .env) au port de votre serveur.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.BACKEND_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
