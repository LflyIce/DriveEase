import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            // DriveEase Express 后端：后端路由本身就是 /api/*，这里直接透传前缀
            target: 'http://localhost:3001',
            ws: true,
          },
        },
      },
    },
  };
});
