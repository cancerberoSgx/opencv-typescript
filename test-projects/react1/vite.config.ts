import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs, so the same build works whether it's served from "/" (local
  // preview) or a subpath (GitHub Pages, e.g. "/opencv-typescript/demos/react1/").
  base: "./",
});
