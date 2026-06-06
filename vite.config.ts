import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Set base to '/lick/' for GitHub Pages (repo name = lick)
// Change this to '/' if using a custom domain or different repo name
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/lick/',
})
