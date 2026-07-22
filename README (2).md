# Nur al-Quran — Standalone Website

A fast, responsive Quran reading & recitation website built with plain HTML, CSS, and JavaScript. No build step required.

## Features
- Beautiful Islamic UI with dark/light theme
- Hero + Quran keyword search
- Daily random Ayah
- Continue reading (saved in localStorage)
- All 114 Surahs, filterable
- Surah detail page: Arabic (Uthmani), Urdu translation, Juz/Page/Hizb info
- Multi-reciter audio player with auto-play-next
- Deep links to specific ayahs (`#/surah/2#ayah-255`)
- Mobile & desktop responsive
- Graceful loading states and error handling

## Data & Audio (free & public)
- Quran text & translation: https://api.alquran.cloud
- Audio recitations: https://cdn.islamic.network

## Run locally
Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy
### GitHub Pages
1. Create a repo, push these three files (`index.html`, `style.css`, `script.js`).
2. Settings → Pages → Deploy from `main` branch, root folder.

### Vercel
1. `vercel` → follow prompts, or drag-and-drop the folder onto https://vercel.com/new.
2. No build command needed — it's a static site.

## Files
- `index.html` — markup, templates, font/style imports
- `style.css` — theme tokens, layout, components
- `script.js` — SPA router, API calls, audio player, theme toggle

## License
Original code, MIT.
