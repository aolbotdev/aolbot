import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
  },
  server: {
    port: 3333,
    strictPort: true,
    proxy: {
      '/api-proxy': {
        target: 'https://api.america.fun',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-proxy/, ''),
        secure: true,
      },
      '/guardian-proxy': {
        target: 'https://content.guardianapis.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/guardian-proxy/, ''),
        secure: true,
      },
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: { buffer: 'buffer' },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
})
