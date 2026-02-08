import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: 'https://buzzstyle.work/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://buzzstyle.work',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://buzzstyle.work')
          })
        },
      },
    },
  },
})
