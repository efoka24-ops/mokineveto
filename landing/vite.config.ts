import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Déployé sur GitHub Pages sous /mokineveto/ (project page).
// https://vite.dev/config/
export default defineConfig({
  base: '/mokineveto/',
  plugins: [react()],
})
