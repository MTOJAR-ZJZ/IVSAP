import { defineConfig } from 'vite';

// 自定义插件：对 main.js/db.js/api.js 跳过 esbuild 转译
// 因为这些文件中的 html`...` 模板字符串包含 HTML，不需要 JSX 解析
function serveRawJs() {
  return {
    name: 'serve-raw-js',
    enforce: 'pre',
    transform(code, id) {
      if (/\/src\/(main|db|api|app|utils\/[^/]+|pages\/[^/]+)\.js$/.test(id)) {
        return { code, map: null };
      }
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
