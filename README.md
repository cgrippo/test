# Met Explorer

Randomly discover works from **The Metropolitan Museum of Art's** open
collection. Hit **Surprise me** and get a fresh grid of artworks; click any
piece for a large image and full details, with a link back to metmuseum.org.

Built with **React + Vite**, using the free
[Met Collection API](https://metmuseum.github.io/) (no API key required).

## Features

- **Two discovery modes**
  - _Highlights_ — ~2,300 curator-picked masterworks
  - _Full collection_ — ~368,000 objects that have images
- **Surprise me / Load more / Shuffle** — random sampling from the chosen pool
- **Detail view** — large image, artist, date, medium, department, credit line,
  and a link to the object on metmuseum.org
- Object-ID pools are cached in `localStorage` (24h) so the app stays snappy
- Responsive grid, light/dark theme, lazy-loaded images

## How the randomness works

The Met API has no "give me a random object with an image" endpoint, so the app:

1. Fetches a **pool of object IDs** once (from `search?hasImages=true`), all of
   which are known to have images, and caches it.
2. Randomly **samples** IDs from that pool and fetches each object's details
   with bounded concurrency (to respect the API's rate limits).
3. Over-samples slightly and filters out anything that fails, so every grid
   comes back full.

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
index.html            # Vite entry
src/
  main.jsx            # React root
  App.jsx             # layout, state, pool switching, load-more
  api.js              # Met API client: pools, caching, random sampling
  styles.css          # all styles (light/dark)
  components/
    Card.jsx          # grid tile
    Detail.jsx        # modal detail view
```

## Credits

Data and images courtesy of The Metropolitan Museum of Art via its
[Open Access](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access)
program.
