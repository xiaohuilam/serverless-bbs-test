import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import fs from 'fs'

const wranglerConfig = JSON.parse(fs.readFileSync('../wrangler.jsonc', 'utf-8'));
const apiWorkerUrl = wranglerConfig.vars.API_WORKER_URL;

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      'import.meta.env.API_WORKER_URL': JSON.stringify(isDev ? 'http://localhost:8787' : apiWorkerUrl)
    },
    // 配置开发服务器代理，将 /api 请求转发到 wrangler dev 运行的 worker
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        }
      }
    }
  };
})
