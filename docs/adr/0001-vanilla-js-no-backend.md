# Vanilla HTML/CSS/JS with no backend

The app fetches commander data directly from the Scryfall public API in the browser. We considered Elm (compile step, unfamiliar toolchain), Python+HTMX (requires a running server, no Python available in the dev environment), and React/Vue (unnecessary ceremony for a single-view app). Vanilla JS with the Fetch API delivers the same result with zero build tooling, deploys as a static file to any host, and keeps the codebase readable without framework knowledge.

## Considered Options

- **Elm** — no JS authored by hand, but introduces a compile step and a non-mainstream language
- **Python + HTMX (FastAPI)** — enjoyable model, but requires a server process and Python runtime; eliminated when Python was unavailable in the environment
- **React / Vue** — over-engineered for a single view with one API call
