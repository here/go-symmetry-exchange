# Mirror go: Go Seigen vs Kitani Minoru, 1929

Shown on the "Mirror go (1929)" slide, a full 19x19 game to show symmetry on the board.

Go Seigen (Black, 3p) opens on the centre point (tengen, K10) and then answers each of White's moves at the point opposite it through the centre. He copies 31 moves in a row (through move 63) and breaks the mirror at move 65: White plays K12, whose mirror point is K8, and Black plays G4 instead. Kitani Minoru (White, 4p) wins by 3 points with no komi, after 282 moves.

Source: [Go Seigen vs Kitani Minoru, 1929-06-03](https://ps.waltheri.net/database/game/5916/), Waltheri's Go database. The SGF is copied in unchanged.

## Board features

`"mirror": true` in `index.json` turns on the mirror marks. While Black is copying, a ring marks the point opposite the last move. On move 65 a dashed ring marks the mirror point Black didn't play. The status line says whether the mirror holds.

## Scoring

Dead stones come from `tools/score-games.mjs`, as for the pro 9x9 games. It takes about 40 seconds at this size. The count matches the recorded W+3 after treating one White stone at P12 (69% alive in the playouts) as dead.

## Adding games

```
node tools/add-games.mjs docs/games/19x19/mirror --size 19 --prefix "" --about "..." game.sgf
```

<!-- games:start -->
<!-- Built by tools/add-games.mjs from index.json; edit index.json, then run: node tools/add-games.mjs docs/games/19x19/mirror --readme -->

### Games (1, in menu order)

| File | Black | White | Date | Komi | Result | Moves | Scoring | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| go-seigen-kitani-1929.sgf | Go Seigen 3p | Kitani Minoru 4p | 1929-06-03 | 0 | W+3 | 282 | playouts, fitted | Mirror go: Go Seigen (Black) opens on tengen and copies White's moves through the centre for 31 moves, then breaks the mirror at move 65. Kitani wins by 3. |
<!-- games:end -->
