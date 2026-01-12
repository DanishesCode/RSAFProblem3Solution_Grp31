import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    middlewareMode: true,
    // Disable HMR (no websocket) to avoid websocket disconnects and forced reloads
    hmr: false,
    watch: {
      // Ignore common backup/temporary files (e.g. from editors or OneDrive)
      ignored: ['**/*.old', '**/*.tmp', '**/*~', '**/*.swp']
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
