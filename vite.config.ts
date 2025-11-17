import { defineConfig } from "vite";
import deno from "@deno/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [deno(), tailwindcss(), enhancedImages(), sveltekit()],
  build: {
    target: "es2024",
  },
  esbuild: {
    target: "es2024",
  }
});
