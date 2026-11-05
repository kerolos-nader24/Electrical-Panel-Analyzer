import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: `/${process.env.GITHUB_REPOSITORY?.split('/')?.[1] ?? ''}/`,
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@panel-analyzer/engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@panel-analyzer/data': path.resolve(__dirname, '../../packages/data/src')
    }
  },
  server: {
    port: 5173
  }
});
