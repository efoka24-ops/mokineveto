import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path selon la cible de déploiement :
// - GitHub Pages (project page) : servi sous /mokineveto/
// - Vercel (domaine racine) : servi sous / — Vercel définit VERCEL=1 au build.
// https://vite.dev/config/
export default defineConfig({
  base: process.env.VERCEL ? '/' : '/mokineveto/',
  plugins: [react()],
})
