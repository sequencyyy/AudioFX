import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/postcss"; // Используем import вместо require
import autoprefixer from "autoprefixer";


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss, // Передаем модуль напрямую
        autoprefixer,],
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000", // Адрес вашего FastAPI сервера
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
})


