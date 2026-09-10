# Met Match

A Tinder-style way to discover the art you actually like. Swipe through
**public-domain works** from The Metropolitan Museum of Art — right to like,
left to pass — and get a **taste profile** that tells you which periods,
departments, artists, and themes you gravitate toward, plus a gallery of
everything you liked with links back to metmuseum.org.

Built with **React + Vite**, using the free
[Met Collection API](https://metmuseum.github.io/) (no API key required).

## Why public domain?

Every work shown is flagged `isPublicDomain` by the Met, meaning it's released
under [CC0](https://creativecommons.org/publicdomain/zero/1.0/) — free to
download, print, and reuse for **any purpose, including commercial**. So once
you find pieces you love, you can actually hang them: order a print, set one as
wallpaper, etc. (The API's `isPublicDomain` *search parameter* doesn't actually
filter, so the app filters on each object's flag client-side — see `src/api.js`.)

## Features

- **Swipe to decide** — drag the card, tap the ♥ / ✕ buttons, or use ← / → keys
- **Categories of hanging art** — Paintings, Drawings, Prints, Photographs
- **Taste profile** — likes are analyzed into top periods (by century),
  departments, artists, and themes/tags, with a one-line "verdict"
- **Your likes gallery** — every liked work, linking to its Met page
- Snappy deck: candidates are prefetched with bounded concurrency and images
  are preloaded; object-ID pools are cached in `localStorage` for 24h
- Likes persist across sessions; responsive, mobile-first, light/dark theme

## How it works

The Met API has no "random public-domain artwork" endpoint, so the app:

1. Fetches a **pool of object IDs** for the chosen category once (from
   `search?hasImages=true&medium=…`) and caches it.
2. Randomly **samples** IDs and fetches each object's details with bounded
   concurrency, **keeping only** those that are public domain and have an image
   (over-sampling to fill the deck, since ~45% aren't CC0).
3. Keeps a small buffer of upcoming cards ready and preloads their images so
   every swipe is instant.

See `src/api.js`.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Project structure

```
index.html
src/
  main.jsx                # React root
  App.jsx                 # deck state, swipe input, category + profile toggles
  api.js                  # Met API client: pools, CC0 filtering, sampling
  styles.css              # all styles (light/dark)
  components/
    SwipeCard.jsx         # draggable card with like/pass gesture
    TasteProfile.jsx      # aggregates likes into a profile + gallery
```

## Credits

Data and images courtesy of The Metropolitan Museum of Art via its
[Open Access](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access)
program.
