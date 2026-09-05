/**
 * Runtime configuration for the app entry (dev server + standalone bundle).
 * Resolution order, highest first:
 *
 *   1. `?adapter=mock|http` / `?gateway=URL` query params (remembered for the tab)
 *   2. `window.FLOW_CONFIG = { adapter, gateway, router, basename }` set by the host page
 *   3. `VITE_FLOW_ADAPTER` / `VITE_FLOW_GATEWAY` / `VITE_FLOW_ROUTER` / `VITE_FLOW_BASENAME` at build time
 *   4. defaults: dev server → mock + browser router; production bundle → http (same origin) + hash router
 *
 * The library entry (`src/lib.js`) does none of this — consumers pass props.
 */
import { createMockAdapter } from './data/index.js'
import { createHttpAdapter } from './adapter/http.js'

const OVERRIDE_KEY = 'flow:override'

export function resolveConfig(env = import.meta.env, win = globalThis) {
  const fromWindow = win.FLOW_CONFIG ?? {}
  const params = new URLSearchParams(win.location?.search ?? '')
  const fromQuery = { adapter: params.get('adapter'), gateway: params.get('gateway') }

  let override = {}
  try {
    if (fromQuery.adapter || fromQuery.gateway) {
      win.sessionStorage?.setItem(OVERRIDE_KEY, JSON.stringify(fromQuery))
    }
    override = JSON.parse(win.sessionStorage?.getItem(OVERRIDE_KEY) ?? '{}')
  } catch {
    override = fromQuery
  }

  const gateway = override.gateway ?? fromWindow.gateway ?? env.VITE_FLOW_GATEWAY ?? ''
  const adapter = override.adapter ?? fromWindow.adapter ?? env.VITE_FLOW_ADAPTER ?? (env.DEV ? 'mock' : 'http')
  const router = fromWindow.router ?? env.VITE_FLOW_ROUTER ?? (env.DEV ? 'browser' : 'hash')
  const basename = fromWindow.basename ?? env.VITE_FLOW_BASENAME ?? ''
  return { adapter, gateway, router, basename }
}

export function createAdapterFromConfig(config) {
  if (config.adapter === 'mock') return createMockAdapter()
  return createHttpAdapter({ baseUrl: config.gateway })
}
