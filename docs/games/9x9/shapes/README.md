# Shapes

Shown on the "Shapes" slide: one setup position (no moves) with four shapes, one per quadrant, clockwise from top left. The ponnuki and the empty triangle are white, the other two black.

| Quadrant | Shape | Colour | Stones (SGF) |
| --- | --- | --- | --- |
| Top left | Ponnuki: four stones around one point, left after a capture | White | cb bc dc cd |
| Top right | Bamboo joint: two parallel pairs, one space apart | Black | gb hb gd hd |
| Bottom right | Empty triangle: three stones in an L around an empty point | White | gg gh hh |
| Bottom left | Tortoise shell: six stones around two points, left after capturing two | Black | cf df bg eg ch dh |

`PL[B]` makes Black move first when someone plays on the board.

After the overview, four more boards build each shape on its own in the centre of the board, from an empty board (`"demo": true, "fromStart": true`), so → steps through each one and then on to the next:

| File | Shape | Moves |
| --- | --- | --- |
| `ponnuki.sgf` | Ponnuki (White) | Black E5; White E6, D5, F5, E4, capturing E5 |
| `bamboo.sgf` | Bamboo joint (Black) | Black D6, E6, D4, E4 |
| `empty-triangle.sgf` | Empty triangle (White) | White D6, D5, E5, around the empty E6 |
| `tortoise-shell.sgf` | Tortoise shell (Black) | White D5, E5; Black D6, E6, F5, E4, D4, C5, capturing D5 and E5 |
