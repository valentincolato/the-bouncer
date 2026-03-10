import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { GoogleGenAI } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'node:http';

const readJsonBody = async (req: IncomingMessage): Promise<any> => {
  let raw = '';
  for await (const chunk of req) {
    raw += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  }
  if (!raw) return {};
  return JSON.parse(raw);
};

const writeJson = (res: ServerResponse, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const createGeminiMiddleware = (apiKey?: string) => {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const pathname = req.url ? new URL(req.url, 'http://localhost').pathname : '';

    if (!pathname.startsWith('/api/gemini/')) {
      next();
      return;
    }

    if (!apiKey) {
      writeJson(res, 500, { error: 'GEMINI_API_KEY is not configured on server' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });

    try {
      if (pathname === '/api/gemini/generate-content' && req.method === 'POST') {
        const payload = await readJsonBody(req);
        const response = await ai.models.generateContent(payload);
        const hasInlineData = response.candidates?.some((c: any) =>
          c.content?.parts?.some((p: any) => p.inlineData)
        );
        writeJson(res, 200, {
          text: hasInlineData ? '' : (response.text || ''),
          candidates: response.candidates || [],
        });
        return;
      }

      if (pathname === '/api/gemini/live-token' && req.method === 'POST') {
        const tokenAi = new GoogleGenAI({
          apiKey,
          httpOptions: { apiVersion: 'v1alpha' }
        }) as any;
        const token = await tokenAi.authTokens.create({
          config: {
            uses: 8
          }
        });

        if (!token.name) {
          writeJson(res, 500, { error: 'Failed to create ephemeral token' });
          return;
        }

        writeJson(res, 200, { token: token.name });
        return;
      }

      writeJson(res, 404, { error: 'Not found' });
    } catch (error: any) {
      const statusCode = typeof error?.status === 'number' ? error.status : 500;
      writeJson(res, statusCode, {
        error: error?.message || 'Unexpected Gemini server error',
      });
    }
  };
};

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const geminiMiddleware = createGeminiMiddleware(env.GEMINI_API_KEY);

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'gemini-dev-backend',
        configureServer(server) {
          server.middlewares.use(geminiMiddleware);
        },
        configurePreviewServer(server) {
          server.middlewares.use(geminiMiddleware);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      allowedHosts: ['the-bouncer-exoncfeztq-uc.a.run.app'],
    },
  };
});
