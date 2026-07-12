# iOS Safari is the mobile support bar

Sweepy’s primary mobile runtime is **iOS Safari in a normal browser tab** on **iOS 16.2+** (not Add to Home Screen / standalone). The pass bar is usable one-handed kitchen UX for Today (Week stacked second): no broken layout, intentional touch/scroll behavior, pinch-zoom never disabled, and webfonts with `font-display: optional` so slow kitchen Wi‑Fi does not mid-session font-swap. Proof is Playwright WebKit in CI plus a real iPhone spot-check; other browsers are best-effort only. Landscape must not break but is not polished. Rejected: iOS 15 (would force container-query / `color-mix` fallbacks), treating PWA chrome as first-class in this pass, and `font-display: swap` without metric matching (visible type shock).

## Consequences

- Automated seam: `test/e2e/home-shell-webkit.spec.ts` under Playwright WebKit (narrow portrait default; landscape smoke).
- Human gate: [real iPhone Safari checklist](../checklists/ios-safari-iphone.md).
- Design doctrine points here from `design.md` so visual rules and runtime support stay linked.
