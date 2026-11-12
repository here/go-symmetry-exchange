# Go: plot, symmetry and exchange

Slides and an interactive demo for a 30-minute talk on the board game Go.
The talk outline is in `agents.md`.

- Site: https://herebox.org/go/symmetry/ (proxied from https://here.github.io/go-symmetry-exchange/)
- Source for the site: `docs/` (published by GitHub Pages from `main` / `docs`). See `docs/README.md` to run it locally.

## Go board

The board, rules and SGF reader are a small custom script (`docs/go.js`, `docs/app.js`) with no dependencies. `tools/score-games.mjs` works out dead stones for pro game records, which don't include them.

Alternative to consider later: [SabakiHQ](https://github.com/SabakiHQ) publishes mature Go libraries, such as `@sabaki/go-board` (rules and board state) and `@sabaki/sgf` (full SGF parsing, including variations and comments). Switching would be worth it if the talk needs SGF variations, comments or markup that the custom script doesn't handle.
