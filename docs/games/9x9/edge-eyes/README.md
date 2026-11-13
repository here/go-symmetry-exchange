# Two eyes on the edge

Shown on the "Two eyes on the edge" slide, after the One eye and Two eyes slides.

A black group on the top edge walls off three empty points in a row (D9, E9, F9) while White surrounds it from below. The last move is Black at E9, the middle point, which splits the space into two one-point eyes at D9 and F9. A white stone in either eye would have no liberties and capture nothing, so it's an illegal move, and the group lives.

The middle point is the vital point of a straight three. Step back one move (←) to the open three-point space: whoever plays E9 first decides whether the group lives. If White takes it, Black is left with one eye.

The position is built as moves (1 white stone as setup, then 8 white and 8 black moves, Black last), so the slide opens on the finished position with White to play, and ← steps back through how it was built. `"demo": true` in `index.json` means it opens on the last move and has no score card.

| Colour | Stones (SGF) |
| --- | --- |
| Black | ca cb db eb fb gb ga, then ea (E9) |
| White | ba bb cc dc ec fc gc hb ha |

## Small two-eye shapes

The slide's second board (`small-eyes.sgf`, a setup position with no moves). The top-edge group from the first board, finished, plus two more small black groups in the bottom corners, each surrounded by White and each living with two one-point eyes:

| Group | Eyes | Black stones (SGF) |
| --- | --- | --- |
| Top edge | D9, F9 | ca cb db eb fb gb ga ea |
| Bottom left corner | A2, B1 | ag bg bh ch ci, and ai (A1) on its own |
| Bottom right corner | J1, J3 | hf if hg hh ih hi |

In the bottom left corner, A1 and B2 are filled in. The A1 stone touches only the two eyes, so its liberties are the same two points as the main group's, and a white stone in either eye is still illegal. In every group, a white stone in an eye has no liberties and captures nothing. White's walls (`ba bb cc dc ec fc gc hb ha af bf cf cg dg dh di gi gh gg gf ge he ie`) keep liberties of their own.
