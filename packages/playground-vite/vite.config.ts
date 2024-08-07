import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pimento from "pimento";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), pimento()],
});
