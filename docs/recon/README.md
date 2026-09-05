# Recon — Phase 0 of EPIC-001

Everything needed to capture the Google Flow UI accurately enough to rebuild it.

## Two capture channels, run both

| Channel | Gives us | How |
|---|---|---|
| **Browser-extension Claude** | Structure, flows, verbatim labels, menu contents, states, screenshots | Paste a prompt from `PROMPTS.md` |
| **DevTools console script** | Ground-truth measured values — colors, type ramp, radii, shadows, box geometry | Paste `capture-tokens.js` into the console |

The script is what keeps us honest. Narrative recon says "rounded card with a subtle border";
the script says `border-radius: 12px` and `1px solid rgba(255,255,255,0.08)`. We build from the
second one.

## Order of operations

1. Sign in to Flow. Open a project **that already has generated clips in it.**
2. Run `RECON-01` (site map) — it tells us what screens exist and therefore how many token
   captures to take.
3. On each major screen, run `capture-tokens.js` and save the output as
   `results/tokens-<screen>.json` (e.g. `tokens-editor.json`).
4. Run the missions **in number order** — they were renumbered into execution order.
   `RECON-02` → `RECON-03` → `RECON-04` unblocks every MVP story. Save each reply as
   `results/RECON-0N-<slug>.md` and tick it off in `STATUS.md`.
5. Drop screenshots in `results/shots/` named `<screen>-<state>-1440.png`, captured per the
   screenshot protocol in `PROMPTS.md` — **1440 × 900, DPR 1, no browser chrome.** These become
   the CI diff references, so a shot at the wrong size is worse than no shot.
6. Tell me it's done — I lock the surface list and write the stories.

`RECON-02` (implementation fingerprint) decides our styling stack — it blocks STORY-100, so it
runs first. `RECON-06` (accessibility) is P1 — Phase 1 and 2 stories can start without it.

## Running the console script

Open DevTools → Console → paste the entire contents of `capture-tokens.js` → Enter.
It logs the JSON and copies it to the clipboard. It reads only styles the browser already
computed and sends nothing anywhere.

It also reads visible text and aria-labels, so on a signed-in account the dump can contain your
email, display name and project titles. Emails are stripped automatically; add anything else to
the `REDACT` array at the top of the file before running, and skim the output before committing.

If the console refuses pasted code, type `allow pasting` first and press Enter.

## What "good recon" looks like

- Verbatim label text, in the app's own words. `"Frames to Video"` — not "the frames option".
- Numbers: `48px`, `#1F1F1F`, `220ms ease-out`. Not "medium", "dark", "quick".
- `UNKNOWN` written down explicitly. A confident guess costs a whole story's rework;
  an honest gap costs one follow-up question.
- Screenshots for anything visual, at the exact protocol viewport — they settle arguments that
  prose can't, and under D1 (pixel-exact) they *are* the acceptance criteria.

## Layout

```
docs/recon/
  README.md            ← this file
  PROMPTS.md           ← the 9 recon missions, copy-paste ready
  capture-tokens.js    ← DevTools console capture
  results/             ← everything that comes back
    RECON-0N-*.md
    tokens-*.json
    shots/
```
