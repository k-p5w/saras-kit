import { defineConfig } from 'vite'

export default defineConfig({
  root: 'build',
  base: '/saras-kit/merge-game/',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})
