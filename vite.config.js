import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// On GitHub Pages the app is served from https://<user>.github.io/test/, so
// production assets need the '/test/' base. Local dev stays at '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/test/' : '/',
  plugins: [react()],
}))
