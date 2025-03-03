import { defineConfig } from 'vite'
import deno from '@deno/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [deno()],
  server: {
    fs: {
      // Allow serving files from the project root
      allow: ["."]
    }
  }
})
