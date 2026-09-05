import { defineConfig } from '@playwright/test'

/**
 * End-to-end harness for the release bundle behind a real (fake) Python
 * gateway. Needs the protocol package's deps: `pip install -e "protocol/python[dev]"`.
 * Set FLOW_PY to a specific interpreter (default: python3).
 */
const py = process.env.FLOW_PY ?? 'python3'
const media = process.env.FLOW_FAKE_MEDIA ?? './fake-media'

export default defineConfig({
  testDir: './tests',
  testMatch: /gateway\.spec\.js/,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:8765',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: {
    command: `npm run build && cd protocol/python && rm -rf ${media} && ${py} -m flow_protocol.examples.fake --ui ../../dist --port 8765 --ticks 3 --media ${media}`,
    url: 'http://localhost:8765/flow/capabilities',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
