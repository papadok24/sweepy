# Real iPhone Safari checklist

Manual gate for quirks Playwright WebKit cannot catch. Assumes a **normal Safari tab** on **iOS 16.2+** (not Add to Home Screen / standalone) — see [ADR 0007](../adr/0007-ios-safari-mobile-support.md).

## Setup

- Device: household iPhone, portrait first
- Browser: Safari tab (not home-screen icon)
- Network: normal kitchen Wi‑Fi; optionally a constrained/throttled run for fonts

## Portrait kitchen path (required)

1. Open Sweepy home (`/`). Confirm **Today** is above **Week**.
2. Tap a Today completion with one hand — hits cleanly, checked state is obvious.
3. Tap several completions quickly — soft-stack celebration still feels usable; with Reduce Motion on, no sparkle travel.
4. Confirm the page does **not** scroll sideways.
5. Use Today / Week in-page nav — lands on the right section; completions stay reachable after Safari’s toolbar collapses.
6. If a sync or hydrate notice appears, read it and dismiss without obscuring Today permanently.
7. Empty Today / Quiet Sunday copy remains readable; recovery actions stay on-screen.

## Audio latency (cold load)

Do this on a **fresh Safari tab** after clearing website data for the Sweepy origin (or a private tab), so cues are not already cached.

1. Open home and wait for the board to be ready — do not tap yet.
2. Tap any non-check control first (brand / nav) — you should hear **no** muted warm-up leak.
3. Immediately tap a Today completion — the complete cue should feel near-instant (no long first-tap hitch).
4. Tap another completion within ~1.5s — soft (quieter) cue still feels immediate.
5. Leave one Today chore open, complete it last — Full sweep cue starts with the overlay, still near-instant.
6. With the phone on silent / Ring switch muted: actions still succeed; no surprise when unmuted later.
7. Optional constrained network: first check after cold load should still start quickly once the small MP3 cues have fetched (tens of KB, not hundreds).
8. If a hardware keyboard is available: Space on a focused Week checkbox plays the same complete cue after the first trusted key has warmed players.

## Landscape spot-check (must not break)

1. Rotate briefly to landscape.
2. Completions remain tappable; nothing critical is clipped off-screen.
3. Rotate back to portrait — primary experience still feels intentional.

## Fonts (when practical)

1. On constrained network (or first cold load), chore names are readable immediately on system fonts.
2. No jarring mid-session font “pop” after webfonts arrive (`font-display: optional`).

## Zoom honesty

1. Pinch-zoom still works.
2. Focusing the chore name field does not force a surprising full-page zoom.
