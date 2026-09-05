import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * App build (dev server + standalone release bundle).
 *
 * The release bundle is meant to be served by a gateway from any sub-path
 * (`/ui/`, `/flow/`, …) with a hash router, so assets are referenced
 * relatively. `npm run build:mock` overrides `--base=/` for the conformance
 * suite, which drives Flow's real `/project/{uuid}` URLs.
 *
 * The library build lives in vite.lib.config.js.
 */
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? './' : '/',
}))
