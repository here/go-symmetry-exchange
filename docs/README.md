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

The page is a slide show: one section (`.slide`) fills the screen at a time.

- **Next / previous slide:** Space / Shift+Space, Page Down / Page Up (what most presentation clickers send), or the ‹ › buttons bottom right. On slides without a board, the arrow keys also work.
- **Full screen:** F, or the ⛶ button. Esc leaves.
- **Jump to a slide:** the address tracks the slide (`#/2`), so reloads and links keep your place. `#demo` also works.
- **Touch:** swipe left or right outside the board.
- **New slides:** add an element with class `slide` to `index.html`. Give it `data-keys="board"` if its arrow keys should drive a board instead of the slides.

On the board slide:

- Step through a game with the buttons, the slider, or ← → Home End.
- Click an empty point to play the next move. If it matches the recorded move, you just step forward. Otherwise you start your own line from that point, and **Back to game** returns to the record.
- The board enforces captures, no suicide, and simple ko.
- **Autoplay** (button, or P on the board slide) steps through the game at the chosen speed: 2 s, 1 s (default), 0.5 s or 0.25 s per move. At the end it holds the final scoring position for 10 moves' worth of time, then moves on to the next game in the list, wrapping around. Manual mode is the default; stepping, clicking the board or Empty board stops autoplay. Changing the speed or picking a game keeps it running. It pauses while another slide is on screen and picks up where it left off when you come back.
- At the last move of a recorded game, a score overlay shows territory (small squares), dead stones (faded) and a score card with captures, komi and the total. The **Show score** checkbox turns it off. Games that ended by resignation say there was no count.

## Files

- `index.html`, `style.css`: the page.
- `slides.js`: slide show navigation and full screen.
- `app.js`: board rendering, controls, and game loading.
- `go.js`: Go rules and the SGF parser (main line only).
- `games/9x9/index.json`: the list of games shown in the menu, plus each game's `rules`, whether it was `scored`, and `dead`: the points OGS marked at the end (SGF coordinates; a stone there is dead, an empty point is neutral). The SGF files don't record these, so they come from the OGS game API (`https://online-go.com/api/v1/games/<id>`, fields `rules`, `removed`, `score`). Update it when adding games.

## GitHub Pages

This folder is the site. In the repo's **Settings → Pages**, set **Source** to “Deploy from a branch”, branch `main`, folder `/docs`.
The site will be at `https://<user>.github.io/<repo>/`. All paths in the page are relative, so it works under that sub-path.
`.nojekyll` tells Pages to serve the files as they are, without running Jekyll.
