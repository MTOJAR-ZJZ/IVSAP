import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 自定义插件：直接返回 main.js 和 db.js 的原始内容
// 跳过 esbuild 转换，避免模板字符串中的 HTML 被误解析为 JSX
function serveRawJs() {
  return {
    name: 'serve-raw-js',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/src/main.js' || req.url === '/src/db.js' || req.url === '/src/api.js') {
          const filePath = resolve(process.cwd(), req.url.replace(/^\//, ''));
          try {
            const content = readFileSync(filePath, 'utf8');
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(content);
          } catch (e) {
            next();
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  plugins: [serveRawJs()],
});
