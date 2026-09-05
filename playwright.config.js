import { defineConfig } from '@playwright/test'

/**
 * Conformance harness (STORY-104). Viewport matches the RECON-04 capture
 * conditions: 1440×900, DPR 1 — the reference every measured value came from.
 *
 * Runs against the mock adapter with Flow's real URL scheme (build:mock).
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /conformance\.spec\.js/, // gateway.spec.js has its own config (conform:gateway)
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: 'npm run build:mock && npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
    timeout: 60000,
  },
})
