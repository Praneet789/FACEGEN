import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleFalProxy } from './src/server/falProxy';
import { handleGeminiEnhance } from './src/server/geminiProxy';

function apiMiddleware() {
  return {
    name: 'facegen-api-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/realistic', (req: any, res: any) => handleFalProxy(req, res));
      server.middlewares.use('/api/gemini/enhance', (req: any, res: any) => handleGeminiEnhance(req, res));
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [react(), apiMiddleware()],
  };
});
