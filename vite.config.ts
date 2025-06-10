import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    host: true,
    // Add API proxy for bot integration
    proxy: {
      '/api/bot': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        configure: (proxy, options) => {
          // Handle bot API requests
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // This would route to your actual API server in production
            console.log(`Bot API request: ${req.method} ${req.url}`);
          });
        }
      }
    }
  }
});
