import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const frontendRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: frontendRoot,
  envDir: frontendRoot,
  build: {
    outDir: path.resolve(frontendRoot, '../public'),
    emptyOutDir: true,
  },
  plugins: [react()],
  server: {
    port: 5173,
  },
})
