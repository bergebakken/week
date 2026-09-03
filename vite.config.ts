/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // A GitHub Pages project site is served from /<repo>/; a root deploy from /.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
