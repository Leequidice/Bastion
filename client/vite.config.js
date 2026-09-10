import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // Privy's embedded-wallet transaction flow (and friends deep in its
    // dependency tree) expect Node globals like Buffer/process that Vite
    // doesn't polyfill by default — without this, sending a transaction from
    // an embedded (non-external) wallet throws "Buffer is not defined".
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
