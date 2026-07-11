# Nuxt Image for static rasters

Sweepy’s raster images (branding and UI illustrations under `public/img/`) go through `@nuxt/image` with a build-time / static-oriented provider so Cloudflare Workers never depends on runtime IPX. Icons stay on `@nuxt/icon`; SVGs are not routed through Nuxt Image. Rejected alternatives: plain `<img>` (no shared defaults or optimization path), runtime IPX (poor fit for Workers), and Cloudflare Image Resizing (unnecessary cost and ops for a tiny static set; revisit if uploads or large remote images appear).

## Consequences

- App rasters use `<AppImg>` (thin Nuxt Image wrapper that defaults `loading="lazy"`). Use `<NuxtPicture>` when art-direction is needed.
- Format and quality defaults live in Nuxt Image config; lazy cannot be set module-wide, so `AppImg` carries that default.
- Source files live in `public/img/`.
- Empty-state Sweepy CSS placeholders are unchanged by this decision; wiring them to Nuxt Image is a separate change.
