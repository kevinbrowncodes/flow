import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Surfaced by the home page's About panel (STORY-208). */
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

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
  define: { __FLOW_VERSION__: JSON.stringify(version) },
  base: command === 'build' ? './' : '/',
}))
