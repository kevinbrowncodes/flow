# RECON-01 — Site map & surface inventory

**Captured:** 2026-08-21 · signed-in Ultra account · Chrome, Claude side panel docked
**Caveat:** panel was docked, so any layout impression here is at a squeezed width. Structure and
labels are reliable; geometry is not. Re-capture geometry at 1440×900 per the screenshot protocol.

---

*(verbatim recon output)*

## Site Map

| Name | Route / URL pattern | How reached (from app home) | Purpose | Surface type | State variants observed |
|---|---|---|---|---|---|
| Home / Project Gallery | `/fx/tools/flow` | App entry | Landing page listing your projects + promo carousel | Full page | Loading (skeleton grid), populated; card hover reveals rename + delete icons; project thumbnails render dark→lit |
| Promo / Feature carousel | (part of Home) | On Home, top hero | Rotating promos ("Create characters…", "Gemini Omni Flash", "Flow App on the road", "A creative partner at every step", "Your face, your voice, your story") | In-page banner (dismissible via ✕, has dot pager + CTA buttons) | Rotates through ≥6 slides; each slide has its own CTA |
| Daily Bonus bar | (part of Home + project) | Top of Home | Announces "50 extra credits until Aug 31st (Resets daily)" | Dismissible banner | Present; closeable via ✕ |
| Help popover | no route | Home header → **?** icon | Popular help articles + search + send feedback | Popover | Loading (skeletons) → populated (5 article links) |
| Account / Membership popover | no route | Header → **ULTRA** badge or avatar | Shows account, credits, upgrade, avatar, membership, sign out, watermarking, legal + build string | Popover | Populated; Visible-watermarking toggle = Off |
| Header overflow menu | no route | Home header → **⋮** | Flow Music, Flow TV, About Flow, Learn Flow, Send app feedback, Report legal issue, Privacy Notice, Help improve Flow (toggle ON), Delete all projects | Popover menu | — |
| Google account switcher | (Google-owned overlay) | Header → avatar | Google identity | Popover | — |
| Create your avatar | no route (modal) | Account popover → **Create avatar** | Intro/first-run for experimental selfie-video avatar capture | Modal (centered, dimmed backdrop) | First-run intro state ("Get started"); did not proceed (facial capture) |
| Project Editor — All Media | `/fx/tools/flow/project/{projectId}` | Home → click a project card | Main workspace: media grid + right details panel + prompt bar | Full page | Loading ("Loading…" then black), populated; right panel shows per-item prompt/model/AR/length/res |
| — Images filter | same base route (client tab) | Editor sidebar → Images | Filter grid to images | Panel/view within page | Populated (1 uploaded image w/ details) |
| — Videos filter | same base route | Sidebar → Videos | Filter grid to videos | Panel/view | Populated |
| — Scenes filter | same base route | Sidebar → Scenes | Filter grid to scenes | Panel/view | **Empty** ("Start creating or drop media") |
| — Uploads filter | same base route | Sidebar → Uploads | Show uploaded assets | Panel/view | Populated |
| Characters | `/fx/tools/flow/project/{projectId}/characters` | Sidebar → Characters | Build/reuse characters; sample templates + prompt + upload/add | Full page | First-run/empty ("Build and reuse characters…") with 6 sample templates |
| Explore Tools — Community | `/fx/tools/flow/project/{projectId}/tools` | Sidebar → Tools | Browse community-made tools by category | Full page (tabbed) | Populated grid (Image category etc.) |
| — Tools: My Tools tab | `…/tools` (tab) | Tools page → My Tools | Your tools + "Submit to be featured" | Tab view | "My creations" empty (only "Create New") |
| — Tools: Templates tab | `…/tools` (tab) | Tools page → Templates | Premade tool templates to remix | Tab view | Populated (Simple Sketch, Scene Explorer, Mockup, Image Editor, etc.) |
| Media Editor / Detail | `/fx/tools/flow/project/{projectId}/edit/{mediaId}` | Editor → click a media tile | View/edit a single video: player + timeline + version history + edit prompt | Full page | History shown vs. "Show/Hide history" collapsed; playback states |
| Share dialog | no route (modal) | Media editor → share icon | Copy shareable link; "Include inputs" toggle | Modal | Populated (did **not** copy/share) |
| Media editor overflow | no route | Media editor → **⋮** | Download Project, Product Help, Flow Help Center, View all changelogs, Flow TV, About Flow, Learn Flow, Send app feedback, Report legal issue, Privacy Notice | Popover menu | — |
| Output settings popover | no route | Prompt bar → model chip ("Nano Banana 2 x2") | Choose Image/Video, aspect ratio (16:9/4:3/1:1/3:4/9:16), model, count (x1–x4); shows credit cost | Popover | Image tab (models: Nano Banana Pro / 2 / 2 Lite); Video tab exists (models UNKNOWN) |
| Add / Create menu | no route | Editor header → **+** | Upload media, Create Collection, Create Character, Create Scene | Popover menu | — |
| View/Display settings | no route | Editor header → **gear** | View Mode (Grid/Batch), Grid Size (S/M/L), Sound on hover, Return silent videos, Show tile details, Clear prompt on submit | Popover | Toggles at defaults (Sound on hover On, Clear prompt On) |
| Project name menu | no route | Editor → **⋮** next to project title | Rename, View Trash, Delete | Popover menu | — |
| Filters popover | no route | Editor search bar → funnel icon | Filter by Type/Aspect/Resolution/Created/Duration + Sort; shows result count + Clear | Popover | Populated ("1 Result", Uploaded checked) |
| Asset picker ("Add to Prompt") | no route | Prompt bar → **+** | Attach reference assets (All/Images/Videos/Voices/Characters/Avatar/Uploads) to a prompt | Popover panel | Populated + Upload media option |
| Prompt bar — Agent mode | (in-page state) | Prompt bar → **Agent** toggle | Switches prompt to conversational agent input (adds expand + tool icons) | In-page state | Agent ON vs OFF |
| Trash | `/fx/tools/flow/project/{projectId}/trash` | Sidebar → Trash | Restore/permanently delete removed items | Full page | **Empty** ("Trash is empty", Restore/Delete All disabled) |
| Collapsed sidebar | (in-page state) | Sidebar → Collapse | Icon-only navigation rail | In-page state | Collapsed vs expanded |

## Top-level navigation (visual order)

Home header, left→right: **Google Flow** (logo/home) · **Flow Music** · **Flow TV** · **Discord** ·
**Instagram** · **X** · **Help (?)** · **Overflow (⋮)** · **ULTRA** (plan badge) · **Avatar**.

Project editor left sidebar, top→bottom: **All Media · Images · Videos · Characters · Scenes ·
Uploads · Tools**, then (bottom) **Trash · Collapse**.
Editor top bar: back · project name (+⋮) · search · filter · **+** · Help · gear · ⋮ · ULTRA · avatar.

## Gated / disabled / external

- **Upgrade** / **Manage membership** → Google One subscription pages, off-domain. Not exercised.
- **"7375 Google Flow credits"** → `one.google.com/ai/activity`. Credits are the metering
  mechanism; output settings shows "Generating will use N credits" per action.
- **Restore All / Delete All** in Trash **disabled** because trash is empty.
- **Visible watermarking** toggle present, set **Off**.
- **Create your avatar** labeled an **"experimental feature."**
- **Help improve Flow** toggle (ON) in header overflow.
- No per-model "locked behind Pro" badges seen; gating is expressed through credits + Upgrade CTA.

## Referenced but NOT reached

External/financial links, Flow Music (`flowmusic.app`), Flow TV (`labs.google/flow/tv`), avatar
capture flow, share link execution, **Video-tab model list**, About/Learn/changelog destinations,
**Collections** view, **Voices / Avatar** asset-picker tabs, **Batch view mode**, **Grid sizes S/L**,
timeline **"+" add-clip**.

## 5 most central screens

1. **Project Editor / All Media** (`/project/{id}`)
2. **Media Editor / Detail** (`/project/{id}/edit/{mediaId}`)
3. **Home / Project Gallery** (`/fx/tools/flow`)
4. **Output settings popover**
5. **Characters** (`/project/{id}/characters`)
