# Web board

A static page that shows the 9x9 games in `games/9x9/` (inside this folder) on a playable board.
It has no build step and no dependencies.

## Run

Serve this folder:

```sh
python3 -m http.server 8000 --directory docs
```

Then open http://localhost:8000/ in a browser.
To open a particular game directly, add `?game=ogs-10903248.sgf` to the URL.

Opening `index.html` straight from disk (`file://`) won't work, because browsers block `fetch` there.

## Use

- Step through a game with the buttons, the slider, or ← → Home End.
- Click an empty point to play the next move. If it matches the recorded move, you just step forward. Otherwise you start your own line from that point, and **Back to game** returns to the record.
- The board enforces captures, no suicide, and simple ko.

## Files

- `index.html`, `style.css`: the page.
- `app.js`: board rendering, controls, and game loading.
- `go.js`: Go rules and the SGF parser (main line only).
- `games/9x9/index.json`: the list of games shown in the menu. Regenerate it after adding SGFs.

## GitHub Pages

This folder is the site. In the repo's **Settings → Pages**, set **Source** to “Deploy from a branch”, branch `main`, folder `/docs`.
The site will be at `https://<user>.github.io/<repo>/`. All paths in the page are relative, so it works under that sub-path.
`.nojekyll` tells Pages to serve the files as they are, without running Jekyll.
