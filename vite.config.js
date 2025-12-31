import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://campaign-builder-one.vercel.app",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
