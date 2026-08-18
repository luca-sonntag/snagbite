import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Single source of truth for the user-facing app version: the same
// android/version.properties the release script (scripts/release.ps1) bumps and
// Gradle reads for the Play Store build. Injected at build time so web and
// native stay in sync without a hardcoded string.
const configDir = dirname(fileURLToPath(import.meta.url))
function readAppVersion(): { name: string; code: string } {
  try {
    const text = readFileSync(resolve(configDir, 'android/version.properties'), 'utf-8')
    const name = text.match(/VERSION_NAME=(.+)/)?.[1]?.trim() ?? '0.0.0'
    const code = text.match(/VERSION_CODE=(.+)/)?.[1]?.trim() ?? '0'
    return { name, code }
  } catch {
    return { name: '0.0.0', code: '0' }
  }
}
const appVersion = readAppVersion()

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion.name),
    __APP_BUILD__: JSON.stringify(appVersion.code),
  },
  server: {
    // Bind to 0.0.0.0 so a physical device / emulator can reach the dev server
    // during Capacitor live-reload (`npm run cap:live`).
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
    }
  },
  resolve: {
    alias: {
      '@cookbook/shared': resolve(configDir, '../shared/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split stable dependencies into their own chunks. This doesn't shrink
        // the first-launch parse (all of these are needed eagerly), but it keeps
        // vendor code cached across OTA updates — an OTA bundle only changes app
        // code, so the browser reuses these chunks instead of re-downloading them.
        manualChunks(id: string) {
          if (id.includes('/src/i18n')) return 'i18n';
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            return 'vendor';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss()
  ]
})
