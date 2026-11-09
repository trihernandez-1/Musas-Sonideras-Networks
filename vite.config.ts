import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves this project at /Musas-Sonideras-Networks/, not the domain root —
  // only applied to the production build so `npm run dev` keeps serving at the root.
  base: command === 'build' ? '/Musas-Sonideras-Networks/' : '/',
}))
