# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Tokocrypto96/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Tokocrypto96/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Make a GTA-style poster from your own photo and a caption — the multi-panel cover look, bold gradient lettering and a Vice City sunset or neon grade — and export it as a PNG to share. An entry for [make.fun](https://make.fun/bounty/gta6-cover-art-01).

**Runs offline:** the app is plain static files in `app/`. Open `app/index.html` in a desktop browser and everything works with no network request at all. Your photos are read on your own machine and never uploaded anywhere.

![Poster example](screenshots/1-cover.jpg)

## What it does

- **Photos** — bring up to 4 of your own, or start with the two built-in samples (Boulevard, Pier). Tap a photo to drop it into the selected panel.
- **Layout** — four poster layouts: 2×2 grid, Hero + 3, full bleed, 3×3 grid.
- **Colour grade** — five Vice City grades: Sunset, Neon night, Vice City, Golden hour, Noir.
- **Export size** — three post sizes: square 1080×1080, portrait 1080×1350, wide 1920×1080.
- **Caption** — an editable title in bold gradient type (Anton) and a neon script subtitle (Pacifico), with a title-size slider.
- **Per-panel crop** — tap a panel on the poster to select it, drag to move the photo inside it, and use the zoom slider to frame it.
- **Export** — export the current size as a PNG, or all three sizes in one go.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

No build step and nothing to install. Any static file server will do.

## Layout of the repo

- `app/index.html` — the editor page
- `app/style.css` — the editor styling (dark violet UI, neon pink accents)
- `app/src/cover.js` — the poster engine: panel layouts, colour grades, gradient title type, grain and vignette
- `app/src/main.js` — the editor wiring: photos, layout, grade, size, caption, per-panel crop, export
- `app/src/shots.js` — fixed `?shot=` scenes used for the screenshots
- `app/fonts/` — Anton and Pacifico, SIL Open Font License (see OFL.txt)
- `app/samples/` — two sample photos, made with an image model for make.fun, free to use
- `screenshots/` — the poster and the editor, drawn by the app itself
- `main.ts` — hands the entry in: copies `app/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-app.ts` — the kit's dossier library, untouched

## Originality

The layout, the grades and the lettering are our own work; the typefaces are Anton and Pacifico under the SIL Open Font License, and the sample photos were made with an image model. No Rockstar Games logo, wordmark, official artwork, character or font appears anywhere.

## License

MIT — see [LICENSE](LICENSE).
