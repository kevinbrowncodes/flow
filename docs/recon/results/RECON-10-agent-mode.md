# RECON-10 — Agent mode (behaviour)

**Captured:** 2026-09-07 · browser-extension Claude · `flow.google.com/project/…` · Ultra Lite tier
**Focus:** behaviour over appearance. Verbatim replies quoted exactly; UNKNOWN where unconfirmed.
Pill geometry is in RECON-04 §7 and is not repeated here.

---

*(verbatim recon output)*

## 1. WHAT CHANGES ON SCREEN

**Toggling the pill ON (confirmed + full list):**
- The **Agent pill fills solid white** with black "Agent" text (confirmed). When OFF it's a dark/transparent grey pill.
- The **model/output chip disappears** (confirmed). When OFF, the composer's right side shows a chip reading `Video · 720p · 8s · [16:9 icon] · x2`. When ON, that chip is gone.
- **Two new controls appear** on the right of the composer: a document/media icon with a small spark ("Agent instructions") and a tune/sliders icon ("Settings").
- A **fullscreen-expand icon (⤢)** appears at the composer's **top-right** — it is NOT present in the OFF state.
- The placeholder text is unchanged in both states: "What do you want to create?"
- Everything reverses exactly when toggled OFF (pill un-fills, expand icon + the two controls vanish, model chip returns).

**Control 1 — "Agent instructions" (document/spark icon):** opens a right-side panel titled "Agent instructions" with a "+ Add instruction" button and a "Done" button. Each added instruction row contains: an enable/disable **toggle**, an "Instruction title" field, confirm (✓) / cancel (✕) / delete (trash) icons, a **"+ Reference"** attachment button, and a body field with placeholder **"Create a guideline for your agent."** You can add multiple. These are reusable, individually toggleable custom guidelines (effectively per-project custom system rules).

**Control 2 — "Settings" / "Agent settings" (tune icon):** opens a right-side panel titled "Agent settings". Every option with defaults:

- **Confirm before generating** (radio):
  - **"Always"** *(selected/default)* — "Agent will ask for confirmation before generating media."
  - **"Never"** — "Agent will generate media and spend credits automatically."
- **Image generation default:**
  - Aspect: **16:9** *(default)*, 4:3, 1:1, 3:4, 9:16
  - Count: x1, **x2** *(default)*, x3, x4
  - Model dropdown: **🍌 Nano Banana 2** *(default)* — options: Nano Banana Pro, Nano Banana 2, Nano Banana 2 Lite
- **Video generation default:**
  - Aspect: **16:9** *(default)*, 9:16
  - Count: **x1** *(default)*, x2, x3, x4
  - Model dropdown: **Omni 1.1 Flash** *(default)* — options: Omni 1.1 Flash, Veo 3.1 – Lite, Veo 3.1 – Fast, Veo 3.1 – Quality
- A **"Save"** button at the bottom.

**The fullscreen-expand icon:** opens an **overlay side panel on the right** (not a full page) — this is the Agent conversation panel. It shows a session title ("Untitled session" until auto-named), a greeting ("Hi Kevin / What would you like to create?"), three rotating suggestion chips with thumbnails (e.g. "Develop a storyboard", "Learn about generation costs", "Show me the keyboard shortcuts", "How do I get started?", "Edit a video with Omni"), and its own prompt input at the bottom. Its header adds three icons not in the collapsed composer: **"Open session history"** (hamburger), **"Start new session"**, and **"Close" (✕)**. The collapsed composer has none of the transcript/session UI — the expanded view is essentially the whole chat interface.

**Does the input change?** The placeholder stays "What do you want to create?". It accepts multi-line typed prompts and, via the **"+" / "Add ingredients to the prompt box"** button, attachments (see below). Size is the same single-line composer that grows as you type; the expanded view gives it a larger dedicated area.

## 2. WHAT IT ACTUALLY DOES

**Prompt used:** "make me a 3-shot sequence of a car driving into a tunnel at dusk"

**It replies with a structured plan, not prose, and does NOT ask clarifying questions first** — it went straight to a titled storyboard. Its full reply verbatim:

> **Storyboard: The Obsidian Tunnel**
> **Visual Elements to Establish First**
> **Characters**
> The Interceptor: A customized 1970s-style muscle car, painted in a matte midnight blue with chrome accents. It features wide rear tires, a subtle hood scoop, and polished silver rims.
> **Locations**
> Coastal Ridge Road: A winding two-lane highway carved into a cliffside.
> The Obsidian Tunnel: A brutalist concrete tunnel entrance that transitions into a long, ribbed interior lined with warm-toned sodium-vapor lamps.
> **Scene Frames**
> **Frame 1**
> Context: The car speeds along the coastal highway toward the tunnel entrance during the final moments of golden hour. Action: The Interceptor drives rapidly toward the camera before the camera swings around to follow it from behind. The sun is a dying ember on the horizon. Camera Angle: Low-angle tracking shot following the rear bumper. Lighting: Natural golden hour lighting with high contrast and long shadows.
> **Frame 2**
> Context: The critical transition point where the car leaves the natural light and enters the tunnel. Action: The car crosses the threshold. As it enters the shadow, the headlights suddenly snap on. The warm sunset light is replaced by the rhythmic strobe of overhead tunnel lights. Camera Angle: Side-profile tracking shot leveled with the car's door. Lighting: Extreme transition from warm dusk light to rhythmic artificial overhead light.
> **Frame 3**
> Context: Deep inside the tunnel, looking at the car as it recedes into the distance. Action: The Interceptor accelerates, its engine roar echoing. The red taillights glow intensely, leaving a slight motion-blur trail as the car disappears into the curve. Camera Angle: Static low-angle shot from the center of the road looking toward the vanishing point. Lighting: Dark and moody; primary light from receding red taillights and orange ceiling lamps.
> Does this storyboard plan look good? If you're happy with these scenes, I can generate the 3-shot visual grid for you.

**Generate vs. wait:** With the default "Always" confirm setting it **proposes and waits** — it produced only the plan and asked before generating. Its visible "Show thinking" reasoning even stated: *"I'll need to call `storyboard_writer` first to plan the three scenes"* — revealing internal tool calls.

**When approved ("Yes, generate the 3-shot visual grid."):** it generated **one image** — a single 1×3 storyboard grid (not 3 separate clips), using **🍌 Nano Banana 2, 16:9**. It appears as a **normal media tile in the same left-hand grid** (and as a thumbnail in the chat). An "Images" item appeared in the left nav. Its confirmation message: *"I've generated the 3-shot storyboard grid of the blue muscle car's transition from the coastal sunset into the tunnel. Let me know if you'd like to adjust the style or animate this sequence!"*

**Is the prompt it used visible?** Yes — fully, in the tile's detail pane in the main grid. Verbatim:

> A 1x3 horizontal storyboard grid with 3 sequential panels. Consistent art style: cinematic, highly detailed digital illustration with deep violet and burnt orange tones.
> Panel 1: Low-angle tracking shot following a matte midnight blue 1970s muscle car with chrome accents speeding along a coastal highway at dusk. The sunset is a deep orange on the horizon, casting long shadows.
> Panel 2: Side-profile tracking shot of the same blue muscle car as it crosses the threshold into a concrete tunnel. Its circular halogen headlights are glowing bright white, and the lighting transitions from warm dusk to the rhythmic orange glow of overhead sodium lamps.
> Panel 3: Static low-angle shot from inside the tunnel, looking at the rear of the car as it recedes into the distance. Only the intense crimson rectangles of the taillights and the glint of the chrome bumper are visible under the pools of orange light in the dark tunnel.
> Layout: 3 panels arranged in a single horizontal row, separated by thin black borders, each frame numbered 1-3 in the corner.

**Mid-conversation correction ("make shot 2 slower"):** it **revises in place, keeping context** — it did not restart. Verbatim:

> I've updated the storyboard to emphasize the slower pace in the second shot.
> **Updated Frame 2**
> Action: The car decelerates visibly as it approaches the tunnel. The camera lingers on the threshold where the warm sunset light meets the cold, clinical teal light of the tunnel interior. The movement is slow and deliberate.
> I've also refined some of the visual details and added a fourth frame for a smoother transition. Take a look at the full plan in the chat panel.
> Should I regenerate the grid image with these changes, or would you like to move straight to animating this sequence into a video?

It changed only Frame 2 (plus proactively added a 4th frame) and again asked before regenerating — it did not auto-regenerate.

**Attaching a reference image/clip:** Yes. The **"+" / "Add ingredients to the prompt box"** button opens an asset picker with a search box, a "Recent" sort, category tabs (**All, Images, Videos, Voices, Characters, Avatars, Uploads**), an **"Upload media"** option, and an **"Add to prompt"** button. So you can attach an existing image, an existing video clip, a character, avatar, voice, or a fresh upload to any agent turn.

**Does it use the output settings?** It uses the **Agent settings** panel's defaults (its own image/video model, aspect, count), not the non-agent composer chip. It chose the image path (Nano Banana 2, 16:9) for a storyboard grid on its own judgment, and when asked about credits it referenced Omni 1.1 Flash as the video model — matching the Agent-settings defaults.

## 3. THE CONVERSATION ITSELF

- **Visible transcript:** Yes — it lives in the **right-side Agent panel** (the expanded view). User messages are right-aligned bubbles; agent replies are left-aligned with a "Show thinking" expander and per-message thumbs-up/down, copy, and flag icons.
- **Persistence:** Yes. After a **full page reload** the entire session (all messages, the refusal, the credit breakdown, and the generated tiles) reappeared intact. It's **per-project** (tied to this project URL) and saved server-side. Leaving and returning to the project: it persists via Session history (I verified the reload; the session is listed and reopenable). Whether it's also visible from other projects (global) is UNKNOWN — everything observed was project-scoped.
- **Multiple conversations:** Yes. There's a **"Session history"** panel listing saved sessions (mine auto-titled "Dusk Car Tunnel Storyboard") and a **"Create new session" / "Start new session"** action. Each session row's ⋮ menu offers **Rename**, **Report legal issue**, and **Delete** (I did not perform the delete). Sessions auto-name themselves from the conversation content.
- **Model indicator:** There is **no explicit model name/badge on individual replies**. The answering model isn't labeled in the transcript. The models are surfaced only in **Agent settings** (Nano Banana 2 / Nano Banana Pro / Nano Banana 2 Lite for images; Omni 1.1 Flash / Veo 3.1 Lite/Fast/Quality for video) and in the generated tile's metadata (🍌 Nano Banana 2). The name of the *conversational* LLM driving the agent itself is not shown — UNKNOWN.

## 4. LIMITS AND FAILURES

**Credit cost (verbatim, when asked):**

> Since you're on the **Ultra Lite** tier, here's how the credit costs break down for your generations:
> - **Images:** Generating images with **Nano Banana 2** is **Free** (0 credits).
> - **Videos:** If you decide to animate this storyboard using **Omni 1.1 Flash**, the cost depends on the duration and resolution:
>   - **4s:** 4 credits (360p) / 7 credits (720p)
>   - **6s:** 5 credits (360p) / 10 credits (720p)
>   - **8s:** 6 credits (360p) / 12 credits (720p)
>   - **10s:** 7 credits (360p) / 15 credits (720p)

(Consistent with the non-agent composer, which showed "Generating will use 24 credits" for Video · 720p · 8s · x2 = 12 × 2.)

**Refusal for something it can't do** (asked: "Email this storyboard to my client and book me a flight to Los Angeles."). Verbatim:

> Unfortunately, I can't help with that. I'm a creative assistant focused on media creation, storytelling, and visual concepts. I can't send emails or book travel, but I'd love to continue developing your storyboard or help you generate some high-quality images and videos for your creative idea!

So its self-defined scope is "media creation, storytelling, and visual concepts."

**Rate/turn limits:** No turn limit or rate-limit message was encountered across ~5 turns. Any hard cap is UNKNOWN.

**Thinking/streaming indicator:** Yes. While thinking it shows a **three-dot animated indicator** and the send arrow becomes a **"Stop"** button. The reply does **not** stream token-by-token; instead it shows **named reasoning-step labels that advance** ("Clarifying the Visualization Intent" → "Defining the Shot Sequence" → "Considering Motion's Intent"), then the **full formatted answer appears at once** when done. Each answer keeps a collapsible **"Show thinking"** transcript of those reasoning steps. Generation of the actual image showed a **percentage progress** on the tile (15% → 51% → done).

## Screenshot inventory (captured this session)
Pill OFF baseline (`ss_0140ta96m`, zoom `ss_...` showing the model chip); pill ON (`ss_698037wme`, zoom showing white pill + expand + two controls); Agent instructions open (`ss_9307v1at1`, zoom `ss_...`); Agent settings open with all sub-sections (`ss_3736f17kj` + zooms + model dropdowns `ss_37544ay0b`, `ss_9770dpnwh`); expanded view (`ss_4789s6mf4`); conversation mid-reply with "Stop" + thinking dots + reasoning-step label (`ss_8184gfhlb`, `ss_5502wud78`, `ss_97577hgqs`); ingredients/attachment picker (`ss_3409dv1lr`); refusal (`ss_6396hsflr`); credits (`ss_2665w892q`); persistence after reload (`ss_02814j3nl`); session history + options menu (`ss_9437eb6py`, `ss_8232i0rs7`).

One safety note: I did **not** click Delete on the session, and I made no changes to Agent instructions/settings — those were opened for inspection only and closed without saving.

---

## Notes on this capture (added when filing, 2026-09-07)

The shape Google built: **plan → confirm → generate**, with a reusable **instruction library**, a
**settings panel** (confirm-before-generate, per-mode defaults), **server-side per-project
sessions**, and **reasoning-step labels** instead of token streaming. Media lands as ordinary
tiles. The conversational layer sits *on top of* that shape; it is not the shape itself.

What maps to a local backend is decided in `spark-cosmos3` (the agent epic there), not here.
The three ideas most worth keeping regardless of backend: the confirm gate before spending,
the instruction library, and step labels for long-running work.
