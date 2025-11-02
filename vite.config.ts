import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handleFalProxy } from './src/server/falProxy';

function falMiddleware() {
  return {
    name: 'fal-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/realistic', (req: any, res: any) => handleFalProxy(req, res));
    }
  };
}

export default defineConfig({
  plugins: [react(), falMiddleware()],
});
