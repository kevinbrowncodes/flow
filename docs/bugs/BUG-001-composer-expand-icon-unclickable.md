# BUG-001 — The composer's Expand icon cannot be clicked in Agent mode

**Status:** Resolved 2026-09-07 (ships in v0.2.0)
**Found:** 2026-09-07, driving the Agent UI against a real gateway (spark-cosmos3 STORY_032) with headless Chromium
**Affects:** `src/features/editor/Composer.jsx` / `Composer.module.css` (STORY-603, Agent mode only)

## Summary

With the Agent pill on, the composer renders an `open_in_full` icon button
("Expand") at its top-right corner that reopens the agent panel
(`onAgentExpand`). The button is visible, but a click at its centre lands on
the prompt editor instead: `document.elementFromPoint()` at the icon returns
the `Prompt` contenteditable. Playwright's actionability check reports the
same thing and never completes the click. Once a user closes the panel, the
only way back to a run is the batch or the history — the icon is decorative.

## Steps to reproduce

```js
await page.getByRole('button', { name: 'Agent', exact: true }).click()
const btn = page.getByRole('button', { name: 'Expand', exact: true })
await btn.evaluate(e => { const r = e.getBoundingClientRect()
  return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2).getAttribute('aria-label') })
// → "Prompt"
await btn.click({ timeout: 5000 })   // TimeoutError: element intercepts pointer events
```

## Expected vs actual

- **Expected:** the icon receives the click and the agent panel opens.
- **Actual:** the prompt editor receives it; the panel stays closed.

## Root cause

`.expand` is `position: absolute` and is rendered *before* its sibling
`.inputScroll`, which is `position: relative`. Both have `z-index: auto`, so
positioned siblings paint in DOM order and the later `.inputScroll` — whose
box spans the whole composer width — covers the icon.

## Acceptance criteria

- [x] `.expand` stacks above the input (`z-index`), so `elementFromPoint` at its centre is the button
- [x] The Part D conformance run closes the panel and reopens it through the Expand icon with a normal (actionable) click

## Resolution

`.expand { z-index: 1 }`. Part D's run test now closes the panel and reopens it via the icon with an actionable click; without the CSS line that step fails with *"Prompt … intercepts pointer events"* (verified by stashing the fix), with it Part D passes 4/4.
