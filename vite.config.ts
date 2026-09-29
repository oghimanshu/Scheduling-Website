import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'fs';
import path from 'path';

function devHtmlPlugin(): Plugin {
  return {
    name: 'dev-html-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/dev.html';
        }
        next();
      });
    },
    closeBundle() {
      const distDev = path.resolve(__dirname, 'dist/dev.html');
      if (fs.existsSync(distDev)) {
        const content = fs.readFileSync(distDev, 'utf-8');
        fs.writeFileSync(path.resolve(__dirname, 'dist/index.html'), content);
        fs.writeFileSync(path.resolve(__dirname, 'index.html'), content);
        fs.mkdirSync(path.resolve(__dirname, 'docs'), { recursive: true });
        fs.writeFileSync(path.resolve(__dirname, 'docs/index.html'), content);
        fs.writeFileSync(path.resolve(__dirname, '.nojekyll'), '');
        fs.writeFileSync(path.resolve(__dirname, 'docs/.nojekyll'), '');
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile(), devHtmlPlugin()],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'dev.html'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
