import { BLACK, WHITE, EMPTY, other, emptyState, play, parseSGF } from "./go.js";

const GAMES_DIR = "games/9x9/";
const SVG = "http://www.w3.org/2000/svg";
const COLS = "ABCDEFGHJKLMNOPQRST";

const $ = (id) => document.getElementById(id);
const el = (name, attrs = {}, parent) => {
  const e = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

// ---- state -------------------------------------------------------------

let game = null;     // parsed SGF (or an empty game)
let line = [];       // moves currently in effect
let states = [];     // states[i] = position after i moves of `line`
let cur = 0;         // number of moves shown
let divergedAt = null; // move index where the user left the recorded game

function blankGame(size = 9) {
  return { size, komi: "", handicap: 0, black: "", white: "", result: "",
           setup: { [BLACK]: [], [WHITE]: [] }, moves: [] };
}

function initialState() {
  const s = emptyState(game.size);
  for (const pt of game.setup[BLACK]) s.board[pt] = BLACK;
  for (const pt of game.setup[WHITE]) s.board[pt] = WHITE;
  return s;
}

function rebuild() {
  states = [initialState()];
  for (let i = 0; i < line.length; i++) {
    const prev = states[i];
    // Recorded games are trusted: if a move is "illegal" by our rules, still show it.
    let next = play(prev, line[i], states[i - 1]);
    if (!next) { next = { ...prev, board: prev.board.slice() }; if (line[i].pt !== null) next.board[line[i].pt] = line[i].color; }
    states.push(next);
  }
}

function toPlay() {
  if (cur > 0) return other(line[cur - 1].color);
  if (line.length) return line[0].color;
  return game.handicap > 1 || game.setup[BLACK].length > 1 ? WHITE : BLACK;
}

function loadGame(g) {
  game = g;
  line = g.moves.slice();
  divergedAt = null;
  rebuild();
  cur = 0;
  drawGrid();
  render();
}

function goTo(n) {
  cur = Math.max(0, Math.min(line.length, n));
  render();
}

function userMove(pt) {
  const color = toPlay();
  const recorded = line[cur];
  if (recorded && recorded.color === color && recorded.pt === pt) { goTo(cur + 1); return; }

  const next = play(states[cur], { color, pt }, states[cur - 1]);
  if (!next) { flashStatus(pt === null ? "" : "Illegal move"); return; }

  if (divergedAt === null || cur < divergedAt) divergedAt = cur;
  line = line.slice(0, cur).concat({ color, pt });
  states = states.slice(0, cur + 1).concat(next);
  cur++;
  render();
}

function backToGame() {
  if (divergedAt === null) return;
  const at = divergedAt;
  line = game.moves.slice();
  divergedAt = null;
  rebuild();
  goTo(at);
}

// ---- rendering -----------------------------------------------------------

const svg = $("board");
let stonesLayer, ghost;

function drawGrid() {
  const n = game.size, pad = 1;
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `${-pad} ${-pad} ${n - 1 + 2 * pad} ${n - 1 + 2 * pad}`);
  el("rect", { class: "wood", x: -pad + .04, y: -pad + .04, width: n - 1 + 2 * pad - .08, height: n - 1 + 2 * pad - .08, rx: .2 }, svg);

  const grid = el("g", { class: "grid" }, svg);
  for (let i = 0; i < n; i++) {
    el("line", { x1: 0, y1: i, x2: n - 1, y2: i }, grid);
    el("line", { x1: i, y1: 0, x2: i, y2: n - 1 }, grid);
  }

  for (const [x, y] of starPoints(n)) el("circle", { class: "hoshi", cx: x, cy: y, r: .09 }, svg);

  for (let i = 0; i < n; i++) {
    const label = (t, x, y) => { const e = el("text", { class: "coord", x, y }, svg); e.textContent = t; };
    label(COLS[i], i, -.62); label(COLS[i], i, n - 1 + .62);
    label(String(n - i), -.62, i); label(String(n - i), n - 1 + .62, i);
  }

  stonesLayer = el("g", {}, svg);
  ghost = el("circle", { class: "ghost", r: .47, visibility: "hidden" }, svg);
}

function starPoints(n) {
  if (n < 7) return [];
  const e = n >= 13 ? 3 : 2, m = (n - 1) / 2, pts = [[e, e], [n - 1 - e, e], [e, n - 1 - e], [n - 1 - e, n - 1 - e]];
  if (n % 2) pts.push([m, m]);
  if (n >= 19) pts.push([m, e], [m, n - 1 - e], [e, m], [n - 1 - e, m]);
  return pts;
}

function render() {
  const s = states[cur], n = game.size;
  stonesLayer.innerHTML = "";
  for (let pt = 0; pt < s.board.length; pt++) {
    const c = s.board[pt];
    if (c === EMPTY) continue;
    el("circle", { class: `stone ${c === BLACK ? "b" : "w"}`, cx: pt % n, cy: Math.floor(pt / n), r: .47 }, stonesLayer);
  }
  const last = line[cur - 1];
  if (last && last.pt !== null) {
    el("circle", { class: `last ${last.color === BLACK ? "on-b" : "on-w"}`, cx: last.pt % n, cy: Math.floor(last.pt / n), r: .22 }, stonesLayer);
  }

  $("pb").textContent = game.black || "–";
  $("pw").textContent = game.white || "–";
  $("komi").textContent = game.komi || "–";
  $("result").textContent = game.result || "–";
  $("caps").textContent = `● ${s.caps[BLACK]}  ○ ${s.caps[WHITE]}`;

  const slider = $("slider");
  slider.max = line.length;
  slider.value = cur;
  $("first").disabled = $("prev").disabled = cur === 0;
  $("next").disabled = $("last").disabled = cur === line.length;
  $("back-to-game").hidden = divergedAt === null;

  setStatus();
  ghost.setAttribute("class", `ghost stone ${toPlay() === BLACK ? "b" : "w"}`);
}

function setStatus(extra = "") {
  const who = toPlay() === BLACK ? "Black" : "White";
  const last = line[cur - 1];
  const parts = [`Move ${cur} of ${line.length}`];
  if (last && last.pt === null) parts.push(`${last.color === BLACK ? "Black" : "White"} passed`);
  if (divergedAt !== null) parts.push(`your line from move ${divergedAt}`);
  $("status").textContent = `${who} to play · ${parts.join(" · ")}${extra ? " · " + extra : ""}`;
}

let flashTimer;
function flashStatus(msg) {
  if (!msg) return;
  setStatus(msg);
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => setStatus(), 1500);
}

// ---- input -------------------------------------------------------------

function pointFromEvent(ev) {
  const p = svg.createSVGPoint();
  p.x = ev.clientX; p.y = ev.clientY;
  const { x, y } = p.matrixTransform(svg.getScreenCTM().inverse());
  const gx = Math.round(x), gy = Math.round(y), n = game.size;
  if (gx < 0 || gy < 0 || gx >= n || gy >= n) return null;
  if (Math.hypot(x - gx, y - gy) > .5) return null;
  return gy * n + gx;
}

svg.addEventListener("click", (ev) => {
  const pt = pointFromEvent(ev);
  if (pt !== null) userMove(pt);
});
svg.addEventListener("pointermove", (ev) => {
  const pt = pointFromEvent(ev);
  if (pt === null || states[cur].board[pt] !== EMPTY || ev.pointerType === "touch") {
    ghost.setAttribute("visibility", "hidden");
    return;
  }
  ghost.setAttribute("cx", pt % game.size);
  ghost.setAttribute("cy", Math.floor(pt / game.size));
  ghost.setAttribute("visibility", "visible");
});
svg.addEventListener("pointerleave", () => ghost.setAttribute("visibility", "hidden"));

$("first").onclick = () => goTo(0);
$("prev").onclick = () => goTo(cur - 1);
$("next").onclick = () => goTo(cur + 1);
$("last").onclick = () => goTo(line.length);
$("slider").oninput = (e) => goTo(+e.target.value);
$("pass").onclick = () => userMove(null);
$("back-to-game").onclick = backToGame;
$("clear").onclick = () => { $("game-select").value = ""; loadGame(blankGame(9)); };

document.addEventListener("keydown", (e) => {
  if (e.target.closest("select, input")) return;
  const keys = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: line.length };
  if (e.key in keys) { e.preventDefault(); goTo(keys[e.key]); }
});

// ---- game list ---------------------------------------------------------

async function loadFile(file) {
  const res = await fetch(GAMES_DIR + file);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  loadGame(parseSGF(await res.text()));
}

async function init() {
  const select = $("game-select");
  loadGame(blankGame(9));
  try {
    const res = await fetch(GAMES_DIR + "index.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const games = await res.json();
    select.innerHTML = `<option value="">Empty board</option>` +
      games.map((g) => `<option value="${g.file}">${g.black} vs ${g.white} (${g.result})</option>`).join("");
    select.onchange = () => (select.value ? loadFile(select.value) : loadGame(blankGame(9))).catch(showError);
    const first = new URLSearchParams(location.search).get("game") || games[0]?.file;
    if (first) { select.value = first; await loadFile(first); }
  } catch (err) {
    select.innerHTML = `<option value="">Empty board</option>`;
    showError(err);
  }
}

function showError(err) {
  console.error(err);
  $("status").textContent = `Couldn't load games (${err.message}). Serve this folder over HTTP; see README.md.`;
}

init();
