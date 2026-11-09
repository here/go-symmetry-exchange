// Go rules and SGF parsing. Points are indices y * size + x; null is a pass.

export const EMPTY = 0, BLACK = 1, WHITE = 2;
export const other = (c) => (c === BLACK ? WHITE : BLACK);

function neighbors(pt, size) {
  const x = pt % size, y = (pt - x) / size, out = [];
  if (x > 0) out.push(pt - 1);
  if (x < size - 1) out.push(pt + 1);
  if (y > 0) out.push(pt - size);
  if (y < size - 1) out.push(pt + size);
  return out;
}

function groupAt(board, size, pt) {
  const color = board[pt], stones = [pt], seen = new Set([pt]);
  let liberties = 0;
  const libSeen = new Set();
  for (let i = 0; i < stones.length; i++) {
    for (const n of neighbors(stones[i], size)) {
      if (board[n] === EMPTY) {
        if (!libSeen.has(n)) { libSeen.add(n); liberties++; }
      } else if (board[n] === color && !seen.has(n)) {
        seen.add(n); stones.push(n);
      }
    }
  }
  return { stones, liberties };
}

export function emptyState(size) {
  return { size, board: new Int8Array(size * size), caps: { [BLACK]: 0, [WHITE]: 0 } };
}

// Returns the new state, or null if the move is illegal
// (occupied, suicide, or retaking a ko, i.e. repeating `koState`'s board).
export function play(state, move, koState = null) {
  const { size } = state;
  const next = { size, board: state.board.slice(), caps: { ...state.caps } };
  if (move.pt === null) return next;
  if (state.board[move.pt] !== EMPTY) return null;

  const b = next.board, color = move.color, opp = other(color);
  b[move.pt] = color;
  for (const n of neighbors(move.pt, size)) {
    if (b[n] === opp) {
      const g = groupAt(b, size, n);
      if (g.liberties === 0) {
        for (const s of g.stones) b[s] = EMPTY;
        next.caps[color] += g.stones.length;
      }
    }
  }
  if (groupAt(b, size, move.pt).liberties === 0) return null;
  if (koState && b.every((v, i) => v === koState.board[i])) return null;
  return next;
}

// --- SGF ---------------------------------------------------------------

function parseTree(text) {
  let i = 0;
  const ws = () => { while (i < text.length && /\s/.test(text[i])) i++; };

  function value() {
    let v = "";
    i++; // [
    while (i < text.length && text[i] !== "]") {
      if (text[i] === "\\") i++;
      v += text[i++];
    }
    i++; // ]
    return v;
  }

  function node() {
    const props = {};
    i++; // ;
    ws();
    while (i < text.length && /[A-Za-z]/.test(text[i])) {
      let key = "";
      while (/[A-Za-z]/.test(text[i])) key += text[i++];
      key = key.replace(/[a-z]/g, "");
      ws();
      const vals = [];
      while (text[i] === "[") { vals.push(value()); ws(); }
      props[key] = vals;
    }
    return props;
  }

  function gameTree() {
    i++; // (
    ws();
    const nodes = [];
    const children = [];
    while (i < text.length && text[i] === ";") { nodes.push(node()); ws(); }
    while (i < text.length && text[i] === "(") { children.push(gameTree()); ws(); }
    i++; // )
    return { nodes, children };
  }

  ws();
  if (text[i] !== "(") throw new Error("Not an SGF file");
  return gameTree();
}

function toPoint(s, size) {
  if (!s || s.length < 2 || (s === "tt" && size <= 19)) return null;
  const x = s.charCodeAt(0) - 97, y = s.charCodeAt(1) - 97;
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  return y * size + x;
}

// Main line only (first variation at each branch).
export function parseSGF(text) {
  let tree = parseTree(text);
  const nodes = [...tree.nodes];
  while (tree.children.length) { tree = tree.children[0]; nodes.push(...tree.nodes); }

  const root = nodes[0] || {};
  const get = (k) => (root[k] ? root[k][0] : "");
  const size = parseInt(get("SZ"), 10) || 19;

  const setup = { [BLACK]: [], [WHITE]: [] };
  const moves = [];
  for (const n of nodes) {
    for (const p of n.AB || []) { const pt = toPoint(p, size); if (pt !== null) setup[BLACK].push(pt); }
    for (const p of n.AW || []) { const pt = toPoint(p, size); if (pt !== null) setup[WHITE].push(pt); }
    if (n.B) moves.push({ color: BLACK, pt: toPoint(n.B[0], size) });
    if (n.W) moves.push({ color: WHITE, pt: toPoint(n.W[0], size) });
  }

  return {
    size,
    komi: get("KM"),
    handicap: parseInt(get("HA"), 10) || 0,
    black: get("PB"),
    white: get("PW"),
    blackRank: get("BR"),
    whiteRank: get("WR"),
    result: get("RE"),
    // Player to move first (PL), for setup positions; null when not given.
    toPlay: get("PL") === "B" ? BLACK : get("PL") === "W" ? WHITE : null,
    setup,
    moves,
  };
}

// --- Scoring -------------------------------------------------------------

// Scores a final position.
//   dead:     points marked at the end of the game. A stone there is dead and
//             is removed; an empty point there is neutral (dame), as OGS marks it.
//   rules:    "japanese"/"korean" count territory + prisoners (captures and dead
//             stones); anything else counts area (live stones + territory).
//   handicap: under area rules, White gets one point per handicap stone
//             (one fewer under AGA rules).
// Empty regions bordered by only one colour, after removing dead stones,
// are that colour's territory.
export function score(state, { dead = [], komi = 0, rules = "chinese", handicap = 0 } = {}) {
  const { size } = state;
  const b = state.board.slice();
  const deadStones = [];
  const dame = new Set();
  const deadCaptured = { [BLACK]: 0, [WHITE]: 0 }; // stones captured BY colour
  for (const pt of new Set(dead)) {
    if (pt === null || pt === undefined) continue;
    if (b[pt] === EMPTY) { dame.add(pt); continue; }
    deadStones.push(pt);
    deadCaptured[other(b[pt])]++;
    b[pt] = EMPTY;
  }
  for (const pt of deadStones) dame.delete(pt);

  const seen = new Uint8Array(size * size);
  const territory = { [BLACK]: [], [WHITE]: [] };
  const neutral = [];
  for (let pt = 0; pt < b.length; pt++) {
    if (b[pt] !== EMPTY || seen[pt]) continue;
    const region = [pt];
    let borders = 0; // bit 1 = black, bit 2 = white
    seen[pt] = 1;
    for (let i = 0; i < region.length; i++) {
      for (const n of neighbors(region[i], size)) {
        if (b[n] === EMPTY) { if (!seen[n]) { seen[n] = 1; region.push(n); } }
        else borders |= b[n];
      }
    }
    const who = borders === BLACK ? BLACK : borders === WHITE ? WHITE : EMPTY;
    for (const r of region) {
      if (who && !dame.has(r)) territory[who].push(r); else neutral.push(r);
    }
  }

  const stones = { [BLACK]: 0, [WHITE]: 0 };
  for (const v of b) if (v) stones[v]++;

  const r = (rules || "").toLowerCase();
  const japanese = r === "japanese" || r === "korean";
  const k = Number(komi) || 0;
  const hc = japanese || handicap < 2 ? 0 : r === "aga" ? handicap - 1 : handicap;
  const totals = {
    [BLACK]: japanese
      ? territory[BLACK].length + state.caps[BLACK] + deadCaptured[BLACK]
      : territory[BLACK].length + stones[BLACK],
    [WHITE]: (japanese
      ? territory[WHITE].length + state.caps[WHITE] + deadCaptured[WHITE]
      : territory[WHITE].length + stones[WHITE]) + k + hc,
  };
  return { japanese, territory, neutral, dead: deadStones, deadCaptured, stones,
           captures: { ...state.caps }, komi: k, handicapBonus: hc, totals };
}

export function sgfPoint(s, size) { return toPoint(s, size); }
