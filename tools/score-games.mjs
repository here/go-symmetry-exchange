#!/usr/bin/env node
// Works out the dead stones at the end of a game record so the board's score
// overlay can count it, and checks the count against the recorded result (RE).
//
// Usage: node tools/score-games.mjs <dir-with-index.json> [file.sgf ...]
//   Rewrites each scored game's `dead`, `scoreMethod` and `scoreNote` in index.json.
//   With file names, only those games are rescored.
//
// Method
// 1. Monte Carlo ownership: from the final position, play many random games to
//    the end (never filling a player's own eye) and record who owns each point.
//    A group whose stones mostly end up owned by the opponent is dead.
// 2. Check: count the position with those dead stones and compare with RE.
// 3. If it doesn't match, the recorded result is the referee: try flipping
//    groups the playouts were unsure about (15-85% alive), fewest flips first,
//    until the count matches. Groups the playouts are sure about are never flipped.
// 4. If that still doesn't match, try marking a point or two of territory as
//    neutral, which is how a missing protective move (teire) or an unfilled
//    neutral point shows up in a Japanese count. The note says so.
// 5. If nothing matches, keep the Monte Carlo answer and record the difference.
//    That usually means the record stops before the game was finished.

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseSGF, play, emptyState, score, sgfPoint, BLACK, WHITE, EMPTY, other } from "../docs/go.js";

const PLAYOUTS = 3000;
// Only groups the playouts are unsure about may be flipped to fit the result.
const UNSURE = [0.15, 0.85];

// Small seeded RNG so results are repeatable.
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function neighbors(pt, n) {
  const x = pt % n, y = (pt - x) / n, out = [];
  if (x > 0) out.push(pt - 1);
  if (x < n - 1) out.push(pt + 1);
  if (y > 0) out.push(pt - n);
  if (y < n - 1) out.push(pt + n);
  return out;
}

function diagonals(pt, n) {
  const x = pt % n, y = (pt - x) / n, out = [];
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const a = x + dx, b = y + dy;
    if (a >= 0 && b >= 0 && a < n && b < n) out.push(b * n + a);
  }
  return out;
}

// A point that is an eye for `color`: all neighbours are that colour, and the
// opponent holds at most one diagonal (none on the edge).
function isEye(board, n, pt, color) {
  for (const q of neighbors(pt, n)) if (board[q] !== color) return false;
  const d = diagonals(pt, n);
  const bad = d.filter((q) => board[q] === other(color)).length;
  return d.length === 4 ? bad <= 1 : bad === 0;
}

function playout(start, toMove, rand) {
  const n = start.size;
  let s = start, prev = null, color = toMove, passes = 0;
  for (let moves = 0; moves < 3 * n * n && passes < 2; moves++) {
    const empties = [];
    for (let p = 0; p < s.board.length; p++) if (s.board[p] === EMPTY && !isEye(s.board, n, p, color)) empties.push(p);
    let next = null;
    while (empties.length) {
      const i = Math.floor(rand() * empties.length);
      const p = empties[i];
      empties[i] = empties[empties.length - 1]; empties.pop();
      next = play(s, { color, pt: p }, prev);
      if (next) break;
    }
    if (next) { prev = s; s = next; passes = 0; } else passes++;
    color = other(color);
  }
  // Area ownership at the end: stones, plus empty points surrounded by one colour.
  const own = new Int8Array(s.board.length);
  for (let p = 0; p < s.board.length; p++) {
    if (s.board[p] !== EMPTY) { own[p] = s.board[p]; continue; }
    const c = new Set(neighbors(p, n).map((q) => s.board[q]).filter(Boolean));
    own[p] = c.size === 1 ? [...c][0] : 0;
  }
  return own;
}

// Probability each point ends up Black's, from many playouts.
function ownership(state, toMove, seed) {
  const rand = rng(seed);
  const black = new Float64Array(state.board.length), white = new Float64Array(state.board.length);
  for (let i = 0; i < PLAYOUTS; i++) {
    const own = playout(state, i % 2 ? toMove : other(toMove), rand);
    for (let p = 0; p < own.length; p++) { if (own[p] === BLACK) black[p]++; else if (own[p] === WHITE) white[p]++; }
  }
  return { black: black.map((v) => v / PLAYOUTS), white: white.map((v) => v / PLAYOUTS) };
}

function groups(state) {
  const n = state.size, seen = new Uint8Array(n * n), out = [];
  for (let p = 0; p < n * n; p++) {
    if (state.board[p] === EMPTY || seen[p]) continue;
    const color = state.board[p], stones = [p];
    seen[p] = 1;
    for (let i = 0; i < stones.length; i++) for (const q of neighbors(stones[i], n)) if (!seen[q] && state.board[q] === color) { seen[q] = 1; stones.push(q); }
    out.push({ color, stones });
  }
  return out;
}

const toSgf = (pt, n) => String.fromCharCode(97 + (pt % n), 97 + Math.floor(pt / n));
// Board label as shown on the page (columns A-J without I, rows numbered from the bottom).
const label = (pt, n) => "ABCDEFGHJKLMNOPQRST"[pt % n] + (n - Math.floor(pt / n));

function parseResult(re) {
  const m = /^([BW])\+(\d+(?:\.\d+)?)$/.exec(re || "");
  if (m) return (m[1] === "B" ? 1 : -1) * Number(m[2]);
  if (/^(0|Draw|Jigo)$/i.test(re || "")) return 0;
  return null;
}

function* subsets(items, maxSize) {
  // smallest subsets first
  function* rec(start, size, acc) {
    if (acc.length === size) { yield acc.slice(); return; }
    for (let i = start; i < items.length; i++) { acc.push(items[i]); yield* rec(i + 1, size, acc); acc.pop(); }
  }
  for (let k = 1; k <= maxSize; k++) yield* rec(0, k, []);
}

export function analyse(sgfText, rules = "japanese") {
  const g = parseSGF(sgfText);
  const n = g.size;
  let s = emptyState(n), prev = null;
  for (const pt of g.setup[BLACK]) s.board[pt] = BLACK;
  for (const pt of g.setup[WHITE]) s.board[pt] = WHITE;
  for (const m of g.moves) { const nx = play(s, m, prev); if (nx) { prev = s; s = nx; } }

  const target = parseResult(g.result);
  const last = g.moves[g.moves.length - 1];
  const toMove = last ? other(last.color) : BLACK;
  const own = ownership(s, toMove, 12345);
  const gs = groups(s).map((gr) => {
    const mine = gr.stones.reduce((a, p) => a + (gr.color === BLACK ? own.black[p] : own.white[p]), 0) / gr.stones.length;
    return { ...gr, alive: mine, dead: mine < 0.5 };
  });

  const opts = { komi: g.komi, rules, handicap: g.handicap };
  const count = (deadGroups, neutral = []) => {
    const dead = deadGroups.flatMap((gr) => gr.stones).concat(neutral);
    const sc = score(s, { ...opts, dead });
    return { sc, dead, diff: sc.totals[BLACK] - sc.totals[WHITE] };
  };

  const base = gs.filter((gr) => gr.dead);
  let best = count(base);
  const result = (method, note, r = best) => ({
    game: g, final: s, target, method, note,
    dead: r.dead.map((p) => toSgf(p, n)),
    diff: r.diff,
    deadStones: r.dead.filter((p) => s.board[p] !== EMPTY).length,
  });

  if (target === null) return result("none", "Result is not a count; no score.");
  if (best.diff === target) return result("ownership", "Dead stones from Monte Carlo ownership; count matches the recorded result.");

  // Flip the most uncertain groups, fewest flips first.
  const uncertain = gs.filter((gr) => gr.alive >= UNSURE[0] && gr.alive <= UNSURE[1])
    .sort((a, b) => Math.abs(a.alive - 0.5) - Math.abs(b.alive - 0.5)).slice(0, 10);
  for (const flip of subsets(uncertain, 3)) {
    const flipped = new Set(flip);
    const dead = gs.filter((gr) => (flipped.has(gr) ? !gr.dead : gr.dead));
    const r = count(dead);
    if (r.diff === target) {
      best = r;
      const desc = flip.map((gr) => `${gr.color === BLACK ? "Black" : "White"} ${gr.stones.length}-stone group at ${label(gr.stones[0], n)} (${Math.round(gr.alive * 100)}% alive)`).join("; ");
      return result("ownership+result", `Monte Carlo ownership, adjusted to match the recorded result: ${desc} treated as ${flip.map((gr) => (gr.dead ? "alive" : "dead")).join("/")}.`);
    }
  }

  // Mark up to two territory points as neutral (missing teire / unfilled dame).
  const sc0 = best.sc;
  const terr = [...sc0.territory[BLACK], ...sc0.territory[WHITE]];
  const sign = target - best.diff;            // >0: Black needs more, so take from White
  const pool = sign > 0 ? sc0.territory[WHITE] : sc0.territory[BLACK];
  // Prefer points next to the other colour's stones (boundary points).
  const boundary = pool.filter((p) => neighbors(p, n).some((q) => s.board[q] !== EMPTY && !base.some((gr) => gr.stones.includes(q)) && s.board[q] === (sign > 0 ? BLACK : WHITE)));
  const cands = (boundary.length ? boundary : pool).slice(0, 40);
  if (Math.abs(sign) <= 2 && terr.length) {
    for (const pts of subsets(cands, Math.abs(sign))) {
      const r = count(base, pts);
      if (r.diff === target) {
        best = r;
        return result("ownership+neutral", `Monte Carlo ownership; ${pts.length} territory point${pts.length > 1 ? "s" : ""} (${pts.map((p) => label(p, n)).join(", ")}) counted as neutral to match the recorded result, as an unplayed protective move or neutral point would be.`);
      }
    }
  }

  const off = Math.abs(target - best.diff);
  return result("estimate", `Dead stones from Monte Carlo ownership. This count differs from the recorded result (${g.result}) by ${off} point${off === 1 ? "" : "s"}; the record probably stops before the game was played out.`);
}

// ---- CLI ---------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node tools/score-games.mjs <dir-with-index.json> [file.sgf ...]"); process.exit(1); }
  const only = new Set(process.argv.slice(3));
  const idxPath = join(dir, "index.json");
  const idx = JSON.parse(readFileSync(idxPath, "utf8"));
  for (const m of idx) {
    if (only.size && !only.has(m.file)) continue;
    const r = analyse(readFileSync(join(dir, m.file), "latin1"), m.rules || "japanese");
    m.scored = r.target !== null;
    m.dead = r.target === null ? [] : r.dead;
    m.scoreMethod = r.method;
    m.scoreNote = r.note;
    const shown = r.diff === 0 ? "Jigo" : `${r.diff > 0 ? "B" : "W"}+${Math.abs(r.diff)}`;
    console.log(`${m.file}: RE ${r.game.result}, count ${r.target === null ? "-" : shown}, ${r.method}, ${r.deadStones} dead stones`);
    if (r.method !== "ownership" || r.target === null || r.diff !== r.target) console.log("   " + r.note);
  }
  writeFileSync(idxPath, JSON.stringify(idx, null, 2) + "\n");
}
