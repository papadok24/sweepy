# Sweepy design system

Visual doctrine for Sweepy’s household chore UI. Domain language lives in `CONTEXT.md`; styling technology choice is ADR 0004. Components and recipes consume **semantic tokens only** — never raw palette names.

## Principles

1. **Playful kawaii, daily-usable** — soft pastels, bubbly surfaces, chunky tappable controls; cute enough to feel like a light game, clear enough for one-handed kitchen use.
2. **Today first** — opening the app answers “what’s on for today?” Week is secondary overview/planning.
3. **Surfaces vs controls** — every painted element is one role or the other (see Shape law). Never both treatments on one element.
4. **Mint means go / done** — primary actions and completion energy share mint; blush stays brand warmth; lavender secondary chrome; sky quiet/info.
5. **Delight with kindness** — every completion celebrates (visual now; audio/haptic by contract). Soft-stack rapid repeats. Respect reduced motion, mute, and no-vibrate.
6. **Sweepy shows up sparingly** — branding, empty states, celebration beats — not on every chore row.
7. **AA where it matters** — text and interactive controls meet WCAG AA against their surfaces; pastels decorate chrome and washes.

## Color

Light-only. No dark theme in v1.

### Palette (brand swatches)

Named pastels for docs and token wiring. **Do not reference these from component CSS** — use semantic aliases.

| Token | Role | Value |
| --- | --- | --- |
| `--palette-blush-200` | Brand warmth / cheeks | `#f7c4d4` |
| `--palette-blush-400` | Stronger blush accent | `#e889a8` |
| `--palette-mint-200` | Soft mint wash | `#c8f0df` |
| `--palette-mint-400` | Primary action / accent | `#2f9e78` |
| `--palette-mint-500` | Stronger mint (pressed / success punch) | `#248564` |
| `--palette-lavender-200` | Soft secondary wash | `#ddd0f7` |
| `--palette-lavender-400` | Secondary chrome | `#8b6fc7` |
| `--palette-sky-200` | Quiet / informational wash | `#c5e4f7` |
| `--palette-sky-400` | Quiet / informational | `#4f8eb8` |
| `--palette-cream-50` | App canvas | `#fff8f5` |
| `--palette-cream-100` | Raised surface | `#fffefb` |
| `--palette-ink-800` | Primary text / control outline | `#3a2a2c` |
| `--palette-ink-500` | Secondary text | `#6b565a` |
| `--palette-danger-400` | Destructive | `#c44b5e` |

### Semantic aliases

| Token | Maps to | Use |
| --- | --- | --- |
| `--color-canvas` | cream-50 | Page background |
| `--color-surface` | cream-100 | Cards, day panels, empty panels |
| `--color-surface-muted` | blush/mint washes (soft) | Quiet Sunday, soft tints |
| `--color-text` | ink-800 | Body / chore names |
| `--color-text-muted` | ink-500 | Supporting copy |
| `--color-accent` | mint-400 | Primary buttons, key highlights |
| `--color-accent-strong` | mint-500 | Pressed primary |
| `--color-success` | mint-400 | Completion / done |
| `--color-danger` | danger-400 | Destructive actions |
| `--color-quiet` | sky-400 | Informational / quiet Sunday cue |
| `--color-secondary` | lavender-400 | Secondary chrome |
| `--color-brand` | blush-400 | Brand warmth (decorative) |
| `--color-brand-soft` | blush-200 | Soft brand wash |
| `--color-accent-soft` | mint-200 | Soft accent wash / sparkles |
| `--color-secondary-soft` | lavender-200 | Soft secondary wash |
| `--color-quiet-soft` | sky-200 | Soft quiet wash |
| `--color-on-accent` | cream-100 | Text/icons on mint fills |
| `--color-border-control` | ink-800 | Chunky control outlines |
| `--color-focus` | mint-400 | `:focus-visible` rings |
| `--color-outline-soft` | translucent ink | Optional hairlines (rare; not control outlines) |
| `--color-canvas-wash-brand` | brand-soft mix | Page atmosphere (brand) |
| `--color-canvas-wash-accent` | accent-soft mix | Page atmosphere (mint) |

## Typography

| Role | Family | Weight | Use |
| --- | --- | --- | --- |
| Display | **Fredoka** | 500–600 | Brand wordmark, page titles, empty-state headlines |
| Body | **Atkinson Hyperlegible** | 400–700 | Chore names, UI chrome, forms, buttons |

Loaded via CSS `@import` from Bunny Fonts (open licenses). Fallbacks: `ui-rounded, system-ui, sans-serif` (display) and `system-ui, sans-serif` (body).

Type scale (rem on 16px root):

| Token | Size | Line |
| --- | --- | --- |
| `--font-size-sm` | 0.875rem | 1.35 |
| `--font-size-md` | 1rem | 1.45 |
| `--font-size-lg` | 1.125rem | 1.4 |
| `--font-size-xl` | 1.375rem | 1.25 |
| `--font-size-2xl` | 1.75rem | 1.2 |
| `--font-size-display` | 2.25rem | 1.1 |

## Shape law

Strict two roles — pick one per element:

| Role | Class | Treatment |
| --- | --- | --- |
| **Surface** | `.surface` | Large radius (`--radius-lg` / `--radius-xl`), soft elevation or wash, **no** heavy outline |
| **Control** | `.control` | Same radius scale, **chunky 2–3px** outline using `--color-border-control`, tappable |

Shared radius tokens: `--radius-sm` 10px · `--radius-md` 14px · `--radius-lg` 20px · `--radius-xl` 28px · `--radius-pill` 999px.

## Density

Chunky comfort: **min 44–48px** interactive targets (`--target-min`), generous padding (`--space-*`), prefer white space over packing.

Space scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 (`--space-1` … `--space-7`).

## Motion & celebration

### Visual (shipped in CSS)

- Short springy transitions for press / check / settle (`--motion-fast`, `--motion-med`, `--ease-spring`).
- Completion: big friendly check + sparkle language (`.celebrate`, `.completion[aria-checked="true"]`).
- Soft-stack: rapid repeats use `.celebrate--soft` (lighter motion, shorter sparkle).
- `prefers-reduced-motion: reduce` — collapse celebrations to an instant state change (no sparkle travel).

### Full sweep (Today milestone)

Fires when the board **transitions** into a Full sweep: every Assignment in **today’s** Day bucket has a Completion for the **current Week**. Empty today (no Assignments) is never a Full sweep. Glossary: `CONTEXT.md`.

| Rule | Contract |
| --- | --- |
| **Surface** | Today / current-day surface only (`.today-shell`). Completing the last open Today slot from the Week grid does **not** fire Full sweep unless that check happens **on Today**. |
| **Transition only** | Fire on incomplete → Full sweep. Landing on an already-complete Today does not re-fire. |
| **Replay** | After an uncheck, when the board returns to Full sweep again, celebrate again. |
| **Last check** | **Replace** the per-chore row celebrate — no stacked `.celebrate` + Full sweep on the same check. |
| **Cheer beat** | Board overlay: soft wash over the Today shell, list dims underneath, large centered Sweepy (`/img/sweepy.png`), copy **“Full sweep!”** / **“Every chore today — checked.”** |
| **Duration** | ~1.8s auto-play, then rest. |
| **Reduced motion** | Static overlay (no wash/pop travel); still show the beat, then rest. |
| **Audio** | Distinct cue `/audio/sweepy_full_sweep.wav` at volume `1` (asset may land with or just after visual). Same playback rules as other delight cues. |
| **Haptic** | Later — stronger pattern than `complete`; not required to ship visual/audio. |

CSS hooks: `.full-sweep-overlay` plus `.celebrate-beat` / `.sweepy-mascot--cheer` as needed. Mascot stays out of chore rows (see Mascot).

### Audio / haptic contracts

| Event | When | Visual | Audio | Haptic (later) |
| --- | --- | --- | --- | --- |
| `complete` | First completion after a quiet gap | Full celebrate | `/audio/sweepy_chore_complete.wav` at volume `1` | Light buzz |
| `complete-soft` | Rapid follow-up Completions (same 1.5s window as soft celebrate) | Soft celebrate | Same completion WAV at volume `0.45` | Softer or skipped |
| `add-chore` | After Chore create + Week view refresh both succeed | Drawer closes / board updates | `/audio/sweepy_add_chore.wav` at volume `1` | — |
| `full-sweep` | Board transitions into Full sweep on Today (see above) | Board overlay cheer (~1.8s) | `/audio/sweepy_full_sweep.wav` at volume `1` | Stronger pattern |

Playback is best effort via one client-only sound interface that preloads and reuses WAV players per cue. Repeated triggers restart the existing cue (no overlapping players). Rejected or unsupported media playback is ignored and never alters Chore creation, Completion persistence, or visual feedback. Browser / OS mute remains authoritative — no in-app sound preference. Reduced motion stays independent of audio.

Fallbacks: OS mute → no audible output (actions still succeed); no vibrate API / preference off → no haptic; reduced motion → visual-only instant state (audio unchanged).

## Information architecture

- **Today** (home) — current day bucket + completions. Shell recipe: `.today-shell`.
- **Week** (secondary) — all day buckets for planning. Recipe: `.week-board`.
- **Sweeps** — celebratory look-back; dedicated route from primary nav (see `CONTEXT.md`). Mobile page layout (prototype [#65](https://github.com/papadok24/sweepy/issues/65) variant C): **Scrapbook** — peak Week postcard, horizontal Week postcards (quiet empty slots on Lately/A while), sticker-shelf chores ordered by sparkles (no place numbers). Not Chronicle (trail-first) or Trophy case (podium-first). Prototype branch `prototype/65-sweeps-page`.
- **Primary nav (mobile, four controls)** — when Sweeps sits beside Today / Week / Add chore: **wrap 2×2** equal chunky `.btn.control` peers (prototype [#63](https://github.com/papadok24/sweepy/issues/63) variant A). Not a compact icon strip or a sticky thumb dock.
- **Mobile-first** — stacked day sections by default.
- **Wide container** — `.week-board` becomes columns via **container queries** (not viewport-only).
- **iOS Safari bar** — phone UX is validated against iOS Safari in a browser tab (iOS 16.2+); see ADR 0007 and the [real iPhone checklist](docs/checklists/ios-safari-iphone.md).

## Quiet Sunday

Day bucket `dayOfWeek === 6` (Sunday; 0 = Monday … 6 = Sunday) uses `.day-bucket--quiet`: softer tint (`--color-surface-muted` / sky wash), rest-oriented empty copy. Assignments remain allowed — tone, not a product block.

## Mascot (Sweepy)

Same name as the product (see `CONTEXT.md`).

| Expression | Hook | When |
| --- | --- | --- |
| **idle** | `.sweepy-mascot--idle` | Branding, gentle empty states |
| **cheer** | `.sweepy-mascot--cheer` | Celebration beats (`.celebrate-beat`) |
| **wink** | `.sweepy-mascot--wink` | Playful empty / all-clear moments |

CSS hooks: `.sweepy-mascot` (+ size modifier `.sweepy-mascot--sm` for brand lockups). Mark expressions with `data-sweepy-expression="idle|cheer|wink"` for tests and future asset swaps.

Placement: brand chrome, empty panels, celebration beats — **never** inside every chore row. Size: roughly 64–120px in empty states; smaller in brand lockups.

## Icons

- Primary pack: **MingCute** via `@nuxt/icon` + Iconify (`mingcute:*`).
- Sparse fallback only: **Solar Bold** (`solar:*`) when MingCute lacks a needed metaphor — document each use.
- No emoji-as-UI; no parallel hand-rolled icon set.

## Accessibility

- WCAG **AA** for text and controls against their surfaces.
- Pastels may decorate backgrounds, chips, celebrations — not low-contrast labels.
- Focus: `:focus-visible` ring using `--color-focus` (3px outline offset) on controls.
- Hit targets ≥ 44px.

## Core recipes (CSS hooks)

| Recipe | Classes / hooks | Notes |
| --- | --- | --- |
| Today shell | `.today-shell` | Home surface; lists today’s chore slots |
| Week board | `.week-board` + `.day-bucket` | Stack → columns by container width |
| Quiet Sunday | `.day-bucket--quiet` | Softer rest treatment |
| Chore slot | `.chore-slot.surface` | Soft card row for a chore; nested in a day bucket it flattens to a quiet tint (mint wash when completed) — no card-on-card |
| Completion | `.completion.control` | Unchecked / checked (`aria-checked`) |
| Celebrate | `.celebrate` / `.celebrate--soft` | Motion on successful check |
| Celebrate beat | `.celebrate-beat` + `.sweepy-mascot--cheer` | Mascot cheer moment (not every row) |
| Full sweep overlay | `.full-sweep-overlay` + cheer beat | Today milestone; replaces row celebrate on last check |
| Empty / rest | `.empty-state.surface` (standalone) or `.day-bucket .empty-state` (nested) | Nested empty states do **not** add a second `.surface` — the day bucket is the surface |
| Mascot | `.sweepy-mascot` + `--idle` / `--cheer` / `--wink` | Expression set |
| Buttons | `.btn.control` + `.btn--primary` / `.btn--secondary` | Mint primary; lavender/outline secondary |
| Fields | `.field.control` | Text inputs matching control outline |

## File layout

| Artifact | Path |
| --- | --- |
| Doctrine | `design.md` (this file) |
| Baseline CSS | `app/assets/css/main.css` — `@layer reset, tokens, base, components, utilities` |
| ADR | `docs/adr/0004-vanilla-css-design-system.md` |
| Safari / mobile support | `docs/adr/0007-ios-safari-mobile-support.md` |
| Real iPhone checklist | `docs/checklists/ios-safari-iphone.md` |

Wire CSS in `nuxt.config.ts` via `css: ['~/assets/css/main.css']`.
