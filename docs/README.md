# Web board

A static page with slides and playable 9x9 boards: online games from OGS (`games/9x9/ogs/`), professional games (`games/9x9/pro/`), a shapes position (`games/9x9/shapes/`), one-eye and two-eyes demos (`games/9x9/one-eye/`, `games/9x9/two-eyes/`) and a blank demo board (`games/9x9/blank/`).
It has no build step and no dependencies.

## Run

Serve this folder:

```sh
python3 -m http.server 8000 --directory docs
```

Then open http://localhost:8000/ in a browser.
To open a particular game directly, add `?game=pro-minigo-981031.sgf` (whichever board lists that file opens it) to the URL.

Opening `index.html` straight from disk (`file://`) won't work, because browsers block `fetch` there.

## Use

The page is a slide show: one section (`.slide`) fills the screen at a time.

- **Next / previous slide:** Space / Shift+Space, Page Down / Page Up (what most presentation clickers send), or the ‹ › buttons bottom right. On slides without a board, the arrow keys also work.
- **Full screen:** F, or the ⛶ button. Esc leaves.
- **Jump to a slide:** the address tracks the slide (`#/2`), so reloads and links keep your place. Slide ids work too: `#ogs`, `#pro`.
- **Touch:** swipe left or right outside the board.
- **Slide index:** the first slide lists every slide by number and name, starting with itself (1. Index). Click one to jump there; Home (on slides without a board) comes back.
- **New slides:** add an element with class `slide` to `index.html`. Give it `data-keys="board"` if its arrow keys should drive a board instead of the slides. Give it an `id` and a `data-title`: the slide index lists it under that name, in page order.

On a board slide (each board has its own game list, controls and autoplay):

- Step through a game with the buttons, the slider, or ← → Home End. At the last move (the scoring screen), → goes to the next game in the list; at move 0, ← goes back to the previous game, opened at its last move. Both wrap around the list. Only a fresh press switches games: holding the key, or pressing it again within 0.4 s of reaching the first or last move, doesn't.
- Click an empty point to play the next move. If it matches the recorded move, you just step forward. Otherwise you start your own line from that point, and **Back to game** returns to the record.
- The board enforces captures, no suicide, and simple ko.
- **Autoplay** (button, or P on a board slide) steps through the game at the chosen speed: 2 s, 1 s (default), 0.5 s or 0.25 s per move. At the end it holds the final scoring position for 10 moves' worth of time, then moves on to the next game in that board's list, wrapping around. Manual mode is the default; stepping, clicking the board or Empty board stops autoplay. Changing the speed or picking a game keeps it running. It pauses while another slide is on screen and picks up where it left off when you come back.
- At the last move of a recorded game, a score overlay shows territory (small squares), dead stones (faded) and a score card with captures, komi and the total. Hover over the score card for the result, how the rules count, and how the dead stones were decided. The **Show score** checkbox turns it off. Games that ended by resignation say there was no count.

## Files

- `index.html`, `style.css`: the page.
- `slides.js`: slide show navigation and full screen.
- `app.js`: the board component (`createBoard`): rendering, controls, autoplay and game loading. Every `.board-slide` in `index.html` gets one, built from `#board-template`; its `data-games` names the game folder.
- `go.js`: Go rules and the SGF parser (main line only).
- `games/9x9/ogs/`, `games/9x9/pro/`, `games/9x9/shapes/`, `games/9x9/one-eye/`, `games/9x9/two-eyes/`, `games/9x9/blank/`: SGF files plus an `index.json` per folder, listing the games in menu order with an optional menu `label`, `rules`, `scored`, `dead` (points marked dead at the end, in SGF coordinates; a stone there is dead, an empty point is neutral) and optional `about`, `scoreMethod`, `scoreNote` and `demo` (opens on the last move, no score card). Each folder's README says where its games come from.
- `../tools/score-games.mjs`: works out dead stones for game records that don't include them, checked against the recorded result. See `games/9x9/pro/README.md`.

## GitHub Pages

This folder is the site. In the repo's **Settings → Pages**, set **Source** to “Deploy from a branch”, branch `main`, folder `/docs`.
The site will be at `https://<user>.github.io/<repo>/`. All paths in the page are relative, so it works under that sub-path.
`.nojekyll` tells Pages to serve the files as they are, without running Jekyll.

## Hosting at another address

The site works from any host or folder. It's served at https://herebox.org/go/symmetry/ by a Cloudflare Worker that proxies to GitHub Pages, caching HTML for 60 seconds and `?v=` assets for a long time. Don't set a custom domain in the GitHub Pages settings.

- Every link in `index.html` is relative (`style.css`, `app.js`, `images/…`), and links to other sites are full URLs, so the HTML needs no rewriting.
- `app.js` fetches the game files relative to its own address, not the page's.
- The page needs a trailing slash when it's opened as a folder (`/go/symmetry/`, not `/go/symmetry`). A proxy should redirect to add it. As a fallback, a small script at the top of `index.html` adds it in the browser.
- Keep new paths relative: no leading `/`.

