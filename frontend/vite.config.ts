import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Enable history API fallback for client-side routing
    historyApiFallback: true,
  },
  preview: {
    port: 4173,
    // Enable history API fallback for production preview
    historyApiFallback: true,
  },
});
