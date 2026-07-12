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
