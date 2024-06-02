import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import live from "mui-live";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), live()],
});
