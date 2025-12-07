import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    middlewareMode: true,
    hmr: {
      clientPort: 3000
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
