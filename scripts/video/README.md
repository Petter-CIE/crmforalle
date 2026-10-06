# Tutorial videos (4K)

Records the AllSeats tutorial videos from the real app, in the demo company (Leknesokker, fictional data).

Setup (once): create `scripts/video/.env` with
```
DEMO_EMAIL=...
DEMO_PASSWORD=...
```
(never commit it). Needs Playwright with Chromium, ffmpeg, Python 3 with Pillow.

- `node seed.mjs` – fills an empty demo company with fictional customers, deals, tasks (company names checked
  against Brønnøysundregistrene with `brreg_check.py`; e-mail addresses use the reserved `.example` domain).
- `node tut/vNN-*.mjs` – drives the app at 3840×2160 (page zoomed 3×) and saves screenshots + a timeline.
- `node tut/assets.mjs <slug>` – title cards, step captions, text cards, end card (Geist font).
- `python3 tut/render.py <slug> [--preview]` – smooth 30 fps video with cursor, clicks, zoom and captions.
- `node tut/cleanup.mjs` – removes what the captures created (run after every capture).

Private data is never shown: Brønnøysund panels of real companies are blurred (`autoBlur`), the CRM
inbound address is masked.

## English versions

1. `node tut/translate.mjs en` – switches the demo company's stages, deals, tasks, notes, products, projects and contact titles to English.
2. Capture with `node tut/eNN.mjs` (slugs `en-01-…` – `en-11-…`), then `node tut/cleanup.mjs '<extra filters>'`.
3. `tut/sheet.sh <slug>` builds assets, a fast preview and a contact sheet; `tut/queue.sh <slugs>` renders 4K.
4. `node tut/translate.mjs nb` puts the demo data back in Norwegian.

`tut/segs.py <slug>` prints each scene's start time and length – used for the voiceover scripts.
