# Better Random Commander

A single-page app for discovering random Magic: The Gathering commanders filtered by color identity.

## Features

- **Color identity filter** — select any combination of W/U/B/R/G/C
- **Exact / Within toggle** — match commanders whose identity is exactly your selection, or fits within it (e.g. selecting {W, U} also returns mono-W and mono-U commanders)
- **Mana value range** — dual-handle slider to constrain commander CMC
- **Tag filter** — one-tap filter by tribe (Elves, Dragons, Zombies…), keyword ability (Flying, Lifelink…), or theme (Tokens, Graveyard, Spellslinger…)
- **Commander history** — thumbnails of your last 5 rolls, restored across page reloads
- **Double-faced card support** — flip button for DFC commanders
- **Dark / light theme** — persisted across sessions
- **Links** — direct links to Scryfall and EDHREC for each result

## Usage

Open `index.html` locally or enable GitHub Pages (Settings → Pages) to host the site.

## Development

Edit `app.js`, `style.css`, and `index.html`. Because the app calls the Scryfall API via `fetch()`, browsers block requests when the page is opened as a `file://` URL. Serve with a static file server instead:

```
python -m http.server
```

Then open `http://localhost:8000`.

## Notes

Powered by Scryfall. This is fan content and not affiliated with Wizards of the Coast.
