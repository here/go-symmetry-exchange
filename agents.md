create a static web page to use as a slde show and interactive demo for a 30 minute talk on the board game go.

# Go: symmetry and exchange

Nov 5, 2026 · @mike

A 30-minute introduction to Go built on two ideas, symmetry and exchange, and three favourite shapes, leading to groups that live with two eyes.

## Run of show

| Segment | Minutes | Idea to land |
| --- | --- | --- |
| How I got here | 3 | Why a human game still matters after Deep Blue |
| Proverbs | 4 | Symmetry and exchange as a way of seeing |
| Reading a board | 4 | A simple 9x9 and how to read a diagram |
| Shapes | 6 | Bamboo, tortoise shell, ponnuki, and the empty triangle to avoid |
| Groups and two eyes | 8 | A group lives with two eyes |
| Tactics | 3 | Shi, the one-space jump, sente |
| Keep learning | 2 | Tsume-go, playing in person, handicaps |

## How I got here (3 min)

I first played Go in Berlin in 1999, on a space station, two years after watching Kasparov lose to Deep Blue at chess in 1997.

Three things keep me playing:

- **The result is an image.** Every game ends as a picture on the board, closer to art than to a score sheet.
- **Handicap balancing works surprisingly well.** Stones given to the weaker player make a close game between very different strengths.
- **Proverbs and etiquette.** They have improved my perspective on life, not only my play.

## Proverbs: symmetry and exchange (4 min)

Go proverbs are short rules that carry a way of seeing. Two frame this talk.

**Symmetry (Sayuudoukei): play at the centre of symmetry.** Where the position mirrors itself, the point in the middle is often the key. Counterpoint to raise: there is also a proverb not to play on the point of symmetry, so the idea is a prompt to look, not a rule to obey ([Don't play on the point of symmetry](https://senseis.xmp.net/?DontPlayOnThePointOfSymmetry)).

**Symmetry in a real game: Go Seigen vs. Kitani, 1929.** Mirror go answers every move with the opposite move around the centre point. Playing Black, Go Seigen broke the mirroring on move 63, and Kitani won. This was a full-board game, not 9x9. Use it to show that symmetry is a pattern to notice, then to break at the right moment ([Mirror Go](https://en.wikipedia.org/wiki/Mirror_Go)).

**Exchange (Furikawari): sacrifice plums for peaches.**

- Win the stones, lose the game; give up worthless stones.
- Do not fear furikawari.

Source pages: [Play on the point of symmetry](https://senseis.xmp.net/?PlayOnThePointOfSymmetry), [Essential Go proverbs](https://senseis.xmp.net/?EssentialGoProverbs), [Philip Smith's proverbs page](https://www.philipsmith.ca/Pages/Game_of_Go_pages/Game_of_go_page3_proverbs.htm).

## Reading a board (4 min)

Use one simple 9x9 position to teach how to read a diagram.

- Black and white stones sit on the line crossings, not in the squares.
- Empty points next to a stone are its liberties; a group with none is captured.
- Ask of each diagram: who is to move, which groups are in danger, and where is the point of symmetry?

Slide to prepare: one 9x9 diagram with a few stones, marked to show liberties.

## Shapes (6 min)

Good shape is stones working together efficiently. Show each shape as a diagram with its proverb.

**Strong shapes**

- **Ponnuki:** four stones around one point, left after a capture.
- **Bamboo:** two pairs of stones side by side. Watch the caveat that [the bamboo joint may be short of liberties](https://senseis.xmp.net/?TheBambooJointMayBeShortOfLiberties), and the proverb [don't peep at bamboo joints](https://senseis.xmp.net/?DontPeepAtBambooJoints).
- **Tortoise shell:** a compact, rounded shape.

**Weak shape**

- **Empty triangle:** three stones in an L around an empty corner point; stones that crowd each other.

More: Chapter Six, Shape, in [Essential Go proverbs](https://senseis.xmp.net/?EssentialGoProverbs).

Open question: you mentioned the open flower as a favourite shape. Is that the ponnuki, or a separate shape to add here?

## Groups and two eyes (8 min)

Stones that connect form a group, and a group lives if it can never be captured. The usual way to live is two separate eyes: the opponent cannot fill both.

Walk through these diagrams in order:

1. **One eye:** the group dies, because the opponent can fill the outside liberties and then the eye.
2. **Two eyes:** the group lives; neither eye can be filled.
3. **Centre example:** a group in the middle needs more room for its eyes.
4. **Corner example:** the same group lives in a smaller space.
5. **Smallest two-eye shapes:** a few small eye spaces that make two eyes, shown as a quick gallery.

Link back to the proverbs: giving up stones elsewhere (furikawari) is often the price of making two eyes here.

## Tactics (3 min)

- **Shi (勢), strategic posture:** the momentum and potential of a position, beyond counting stones.
- **Jumping one and playing the biggest points:** chase with the knight's move; flee with the one-space jump.
- **Sente:** the move that keeps the initiative, so you choose where to play next.

## Keep learning (2 min)

- **Tsume-go:** go problems are the best daily practice for reading and for two eyes.
- **Play in person.** Lookers-on see more, so kibitz away and try out variations.
- **Play at your skill level** and use handicaps to keep games close.
- **Lose your first 100 games as quickly as possible.**

Reference: [Don't play on the point of symmetry](https://senseis.xmp.net/?DontPlayOnThePointOfSymmetry), [Essential Go proverbs](https://senseis.xmp.net/?EssentialGoProverbs), [History of 9x9 Go](https://sites.google.com/view/9x9go/history).

## Optional extra 9x9 examples

Have these ready if time allows or questions come up:

- **Simple:** a short 9x9 game to replay move by move.
- **Pro:** a 9x9 game between strong players, to see the shapes and exchanges from this talk in practice.

Open question: which two games do you want to use? Send them and I'll add diagrams.


## Development notes

### Cache busting

GitHub Pages serves files with `cache-control: max-age=600`, so after a push a browser can show the new `index.html` with a stale `app.js` for up to 10 minutes. New buttons then appear but do nothing.

The strategy: every CSS and JS link carries one shared version query, `?v=<version>`.

- `docs/index.html` loads `style.css?v=…` and `app.js?v=…`. It loads only `app.js`; `app.js` imports `slides.js?v=…` and `go.js?v=…`.
- `app.js` reads its own `?v=…` (`import.meta.url`) and adds it to the game fetches (each board's `index.json` and SGFs).
- **Before every push that changes `docs/`, run `tools/bump-version.sh`.** It stamps a new UTC timestamp on every `?v=` in `index.html` and `app.js`.
- Keep every `?v=` identical. A module imported under two different URLs runs twice; for `slides.js` that would build the slide controls twice.
- When adding a new JS module or stylesheet, give its link or import a `?v=` too, so the bump script covers it.
- Images are not versioned. If you replace an image, give it a new file name.

### Game data and scoring

- Games live in `docs/games/9x9/ogs/` (online games, dead stones as the players marked them) and `docs/games/9x9/pro/` (professional games; only games that end in a count, no resignations or time losses), plus `docs/games/9x9/shapes/` (a setup position for the Shapes slide; `PL[B]` sets who moves first) and `docs/games/9x9/eyes/` (the Two eyes slide; `"demo": true` opens it on the last move). Each folder has an `index.json` in menu order and a README with sources.
- Add pro games with `node tools/add-games.mjs docs/games/9x9/pro --root <collection>/9x9 <files...>`. It copies the SGFs, skips games that didn't end in a count or can't be scored to their recorded result, fills in `dead`, `scoreMethod` and `scoreNote`, appends to `index.json` and rebuilds the README tables. Pro records don't mark dead stones, so this scoring step is what makes the score overlay work.
- To pick games, start from `research/cwi-9x9-scoring.md`: every counted game in the CWI 9x9 collection, already scored (full data in the matching `.json`). Rebuild or extend it with `node tools/survey-collection.mjs <collection>/9x9 research/cwi-9x9-scoring`; it resumes and never rescores a game. Scoring takes about 3 seconds per game, so a full run of the 211 counted games takes over 10 minutes.
