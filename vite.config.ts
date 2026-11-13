import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Biologia Semestre Filtro",
        short_name: "Biologia",
        description: "Estudo de Biologia para o semestre filtro",
        lang: "pt-BR",
        start_url: "./",
        scope: "./",
        display: "standalone",
        theme_color: "#0E1618",
        background_color: "#0E1618",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globIgnores: ["**/imagens/**"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/imagens/"),
            handler: "CacheFirst",
            options: {
              cacheName: "biologia-imagens",
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 5000000,
      },
    }),
  ],
});
