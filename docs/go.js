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
    result: get("RE"),
    setup,
    moves,
  };
}
