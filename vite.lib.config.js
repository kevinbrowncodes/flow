import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Library build → dist/lib/flow.js + dist/lib/flow.css (React left external). */
export default defineConfig({
  plugins: [react()],
  publicDir: false, // mock clips + favicon belong to the app bundle, not the library
  build: {
    outDir: 'dist/lib',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/lib.js',
      formats: ['es'],
      fileName: () => 'flow.js',
      cssFileName: 'flow',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react-router'],
    },
  },
})
