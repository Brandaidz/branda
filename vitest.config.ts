/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // <-- On s'assure que ce fichier est bien chargé avant les tests :
    setupFiles: './vitest.setup.ts',
    include: ['**/*.test.{js,ts,jsx,tsx}'],
    exclude: ['node_modules/**', 'dist', 'project_code/node_modules/**'],
  },
})
