# SEO progress

## 25 October 2026 — homepage image audit

Measured live GET responses from https://www.coolinterior.co.uk/:

| Asset | Bytes | HTTP |
| --- | ---: | ---: |
| /assets/surface-gallery/apartment-living-dining-tiled-floor.webp | 91,840 | 200 |
| /assets/blog/reliable-tiler-london-checklist-cover.png | 1,777,994 | 200 |
| /assets/tiling-terrace-inspiration.webp | 447,868 | 200 |
| /assets/white-kitchen-veined-marble-island.webp | 115,376 | 200 |

The hero already has fetchpriority=high, explicit dimensions and async decoding. Most below-fold images already use lazy loading.

Next implementation: encode the reliable-tiler checklist cover as WebP, retain the original PNG as rollback, compare visual fidelity, update image references while preserving alt text and dimensions, and verify HTTP 200 and correct content type after deployment. It is already lazy-loaded; savings concern transferred bytes when the card loads, not a demonstrated improvement in initial LCP. Measure before/after file size; no ranking or Core Web Vitals gain has yet been measured.

Release blocker: Vercel returned 403 for domain verification in team_c5zudjHFeCSdIXmaoyqKlWgq; team access authorisation is required before production target verification or release. No website code changed in this audit.
