import tailwindcss from "@tailwindcss/vite";
<<<<<<< HEAD
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
=======
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";
>>>>>>> origin/main
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  test: {
    environment: 'node', // pure-logic tests only for now (no DOM needed)
  },
});
