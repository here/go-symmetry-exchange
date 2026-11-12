import { BLACK, WHITE, EMPTY, other, emptyState, play, parseSGF, score, sgfPoint } from "./go.js?v=20261112230952";
import { isActive } from "./slides.js?v=20261112230952";

// Cache-busting version from this script's own URL (app.js?v=...), reused for data fetches.
const HERE = new URL(import.meta.url);
const VERSION = HERE.search;
// Game files are fetched relative to this script, not the page address, so the site
// works from any host or folder (with or without a trailing slash).
const SITE = new URL(".", HERE);
const asset = (path) => new URL(path, SITE).href + VERSION;

const SVG = "http://www.w3.org/2000/svg";
const COLS = "ABCDEFGHJKLMNOPQRST";
const HOLD_AT_END = 10; // autoplay: ticks to hold the final (scoring) position

const svgEl = (name, attrs = {}, parent) => {
  const e = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function blankGame(size = 9) {
  return { size, komi: "", handicap: 0, black: "", white: "", result: "",
           setup: { [BLACK]: [], [WHITE]: [] }, moves: [], ending: null, meta: null };
}

function starPoints(n) {
  if (n < 7) return [];
  const e = n >= 13 ? 3 : 2, m = (n - 1) / 2, pts = [[e, e], [n - 1 - e, e], [e, n - 1 - e], [n - 1 - e, n - 1 - e]];
  if (n % 2) pts.push([m, m]);
  if (n >= 19) pts.push([m, e], [m, n - 1 - e], [e, m], [n - 1 - e, m]);
  return pts;
}

// One playable board with its own game list, controls and autoplay.
// `root` is a .board-slide element; `gamesDir` holds index.json and the SGFs.
function createBoard(root, gamesDir, title) {
  root.appendChild(document.getElementById("board-template").content.cloneNode(true));
  const $ = (role) => root.querySelector(`[data-role="${role}"]`);
  const svg = $("board");
  svg.setAttribute("aria-label", `${title || "Go"} board`);

  // ---- state -----------------------------------------------------------
  let game = null;        // parsed SGF (or an empty game)
  let line = [];          // moves currently in effect
  let states = [];        // states[i] = position after i moves of `line`
  let cur = 0;            // number of moves shown
  let divergedAt = null;  // move index where the user left the recorded game
  let showScore = true;   // show the score overlay at the end of a recorded game
  let gameList = [];

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
    if (game.toPlay) return game.toPlay;
    return game.handicap > 1 || game.setup[BLACK].length > 1 ? WHITE : BLACK;
  }

  // The end-of-game score, when the recorded game is on screen at its last move.
  function finalScore() {
    const e = game.ending;
    if (!e || !e.scored || divergedAt !== null || cur !== line.length) return null;
    return score(states[cur], { dead: e.dead, komi: game.komi, rules: e.rules, handicap: game.handicap });
  }

  function loadGame(g) {
    game = g;
    line = g.moves.slice();
    divergedAt = null;
    rebuild();
    cur = 0;
    edgeShownAt = Date.now();
    drawGrid();
    render();
  }

  // When the current game's first or last position came on screen, so a held
  // or fast-repeated arrow key can't run straight past it into another game.
  let edgeShownAt = 0;

  function goTo(n) {
    const was = cur;
    cur = Math.max(0, Math.min(line.length, n));
    if (cur !== was && (cur === 0 || cur === line.length)) edgeShownAt = Date.now();
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

  // ---- rendering -------------------------------------------------------
  let stonesLayer, ghost;

  function drawGrid() {
    const n = game.size, pad = 1;
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `${-pad} ${-pad} ${n - 1 + 2 * pad} ${n - 1 + 2 * pad}`);
    svgEl("rect", { class: "wood", x: -pad + .04, y: -pad + .04, width: n - 1 + 2 * pad - .08, height: n - 1 + 2 * pad - .08, rx: .2 }, svg);

    const grid = svgEl("g", { class: "grid" }, svg);
    for (let i = 0; i < n; i++) {
      svgEl("line", { x1: 0, y1: i, x2: n - 1, y2: i }, grid);
      svgEl("line", { x1: i, y1: 0, x2: i, y2: n - 1 }, grid);
    }
    for (const [x, y] of starPoints(n)) svgEl("circle", { class: "hoshi", cx: x, cy: y, r: .09 }, svg);
    for (let i = 0; i < n; i++) {
      const label = (t, x, y) => { const e = svgEl("text", { class: "coord", x, y }, svg); e.textContent = t; };
      label(COLS[i], i, -.62); label(COLS[i], i, n - 1 + .62);
      label(String(n - i), -.62, i); label(String(n - i), n - 1 + .62, i);
    }
    stonesLayer = svgEl("g", {}, svg);
    ghost = svgEl("circle", { class: "ghost", r: .47, visibility: "hidden" }, svg);
  }

  function render() {
    const s = states[cur], n = game.size;
    const sc = showScore ? finalScore() : null;
    const dead = new Set(sc ? sc.dead : []);
    stonesLayer.innerHTML = "";
    for (let pt = 0; pt < s.board.length; pt++) {
      const c = s.board[pt];
      if (c === EMPTY) continue;
      svgEl("circle", { class: `stone ${c === BLACK ? "b" : "w"}${dead.has(pt) ? " dead" : ""}`, cx: pt % n, cy: Math.floor(pt / n), r: .47 }, stonesLayer);
    }
    if (sc) {
      // Territory marks: a small square of the owner's colour on each scored point
      // (including points under dead stones).
      for (const c of [BLACK, WHITE]) {
        for (const pt of sc.territory[c]) {
          svgEl("rect", { class: `terr ${c === BLACK ? "b" : "w"}`, x: pt % n - .17, y: Math.floor(pt / n) - .17, width: .34, height: .34 }, stonesLayer);
        }
      }
    }
    renderScorecard(sc);
    const last = line[cur - 1];
    if (!sc && last && last.pt !== null) {
      svgEl("circle", { class: `last ${last.color === BLACK ? "on-b" : "on-w"}`, cx: last.pt % n, cy: Math.floor(last.pt / n), r: .22 }, stonesLayer);
    }

    // Name plus rank where the record has one (BR/WR), e.g. "Cho Chikun 9p".
    const who = (name, rank) => [name, rank].filter(Boolean).join(" ") || "–";
    $("pb").textContent = who(game.black, game.blackRank);
    $("pw").textContent = who(game.white, game.whiteRank);
    $("komi").textContent = game.komi || "–";
    $("result").textContent = game.result || "–";
    $("caps").textContent = `● ${s.caps[BLACK]}  ○ ${s.caps[WHITE]}`;
    const about = game.meta?.about;
    $("about").hidden = !about;
    $("about").textContent = about || "";

    const slider = $("slider");
    slider.max = line.length;
    slider.value = cur;
    $("first").disabled = $("prev").disabled = cur === 0;
    $("next").disabled = $("last").disabled = cur === line.length;
    $("back-to-game").hidden = divergedAt === null;

    setStatus();
    ghost.setAttribute("class", `ghost stone ${toPlay() === BLACK ? "b" : "w"}`);
  }

  // How the dead stones were decided, in one line for the score card.
  function methodNote() {
    const m = game.meta || {};
    switch (m.scoreMethod) {
      case "ownership": return game.ending.dead.length ? "Dead stones estimated by computer playouts." : "";
      case "ownership+result":
      case "ownership+neutral":
      case "estimate": return `Estimated: ${escapeHtml(m.scoreNote)}`;
      default: return game.ending.dead.length ? "Dead stones as marked by the players." : "";
    }
  }

  function renderScorecard(sc) {
    const card = $("scorecard");
    const atEnd = game.ending && divergedAt === null && cur === line.length && line.length > 0;
    if (!atEnd || !showScore) { card.hidden = true; return; }
    card.hidden = false;

    if (!sc) {
      const why = /\+T$/.test(game.result) ? "on time" : /\+R$/.test(game.result) ? "by resignation" : "without a count";
      card.title = "";
      card.innerHTML = `<p class="score-note">${game.result ? `Result ${escapeHtml(game.result)}: the game ended ${why}` : "The game ended without a count"}, so there is no score to show.</p>`;
      return;
    }

    const B = BLACK, W = WHITE;
    const rows = [["Territory", sc.territory[B].length, sc.territory[W].length]];
    if (sc.japanese) {
      rows.push(["Captures", sc.captures[B], sc.captures[W]]);
      rows.push(["Dead stones", sc.deadCaptured[B], sc.deadCaptured[W]]);
    } else {
      rows.push(["Stones on board", sc.stones[B], sc.stones[W]]);
    }
    rows.push(["Komi", "", sc.komi]);
    if (sc.handicapBonus) rows.push(["Handicap", "", sc.handicapBonus]);

    const diff = sc.totals[B] - sc.totals[W];
    const res = diff === 0 ? "Jigo (draw)" : `${diff > 0 ? "B" : "W"}+${Math.abs(diff)}`;
    const rules = game.ending.rules ? game.ending.rules[0].toUpperCase() + game.ending.rules.slice(1) : "";
    const differs = game.result && /^[BW]\+\d/.test(game.result) && game.result !== res;
    const method = methodNote();

    // Only the table is shown; the explanation is kept as a hover tooltip
    // (title) to save vertical space.
    const rulesNote = sc.japanese
      ? "territory + captures + dead stones."
      : `stones + territory; captures (${sc.captures[B]} / ${sc.captures[W]}) don't count.`;
    card.title = [`${res}${differs ? ` (recorded ${game.result})` : ""}`,
      `${rules} rules: ${rulesNote}`,
      "Squares mark territory; faded stones are dead.",
      method.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')]
      .filter(Boolean).join("\n");
    card.innerHTML = `
      <table class="score">
        <thead><tr><th></th><th><span class="dot black"></span> Black</th><th><span class="dot white"></span> White</th></tr></thead>
        <tbody>${rows.map(([k, b, w]) => `<tr><th>${k}</th><td>${b}</td><td>${w}</td></tr>`).join("")}</tbody>
        <tfoot><tr><th>Total</th><td>${sc.totals[B]}</td><td>${sc.totals[W]}</td></tr></tfoot>
      </table>`;
  }

  function setStatus(extra = "") {
    const who = toPlay() === BLACK ? "Black" : "White";
    const last = line[cur - 1];
    const parts = [`Move ${cur} of ${line.length}`];
    if (last && last.pt === null) parts.push(`${last.color === BLACK ? "Black" : "White"} passed`);
    if (divergedAt !== null) parts.push(`your line from move ${divergedAt}`);
    if (autoGen) parts.push(cur === line.length ? "autoplay: next game soon" : "autoplay");
    else if (divergedAt === null && gameList.length > 1 && line.length) {
      if (cur === line.length) parts.push("→ next game");
      else if (cur === 0) parts.push("← previous game");
    }
    $("status").textContent = `${who} to play · ${parts.join(" · ")}${extra ? " · " + extra : ""}`;
  }

  let flashTimer;
  function flashStatus(msg) {
    if (!msg) return;
    setStatus(msg);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => setStatus(), 1500);
  }

  // ---- input -----------------------------------------------------------
  function pointFromEvent(ev) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = svg.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    const { x, y } = p.matrixTransform(ctm.inverse());
    const gx = Math.round(x), gy = Math.round(y), n = game.size;
    if (gx < 0 || gy < 0 || gx >= n || gy >= n) return null;
    if (Math.hypot(x - gx, y - gy) > .5) return null;
    return gy * n + gx;
  }

  svg.addEventListener("click", (ev) => {
    const pt = pointFromEvent(ev);
    if (pt !== null) { setAutoplay(false); userMove(pt); }
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

  // Any manual step or move stops autoplay.
  const manual = (fn) => (...args) => { setAutoplay(false); fn(...args); };

  $("first").onclick = manual(() => goTo(0));
  $("prev").onclick = manual(() => goTo(cur - 1));
  $("next").onclick = manual(() => goTo(cur + 1));
  $("last").onclick = manual(() => goTo(line.length));
  $("slider").oninput = manual((e) => goTo(+e.target.value));
  $("pass").onclick = manual(() => userMove(null));
  $("back-to-game").onclick = manual(backToGame);
  $("autoplay").onclick = () => setAutoplay(!autoGen);
  $("speed").onchange = () => { if (autoGen) setAutoplay(true); };
  $("show-score").onchange = (e) => { showScore = e.target.checked; render(); };
  $("clear").onclick = () => { setAutoplay(false); $("game-select").value = ""; loadGame(blankGame(9)); };

  document.addEventListener("keydown", (e) => {
    if (e.target.closest?.("select, input") || !isActive(root)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "p" || e.key === "P") { e.preventDefault(); setAutoplay(!autoGen); return; }
    // → at the last move (the scoring screen) goes to the next game;
    // ← at move 0 goes back to the previous game, shown at its last move.
    // Only a fresh key press, on a position that has been showing for a moment.
    const canSwitch = divergedAt === null && gameList.length > 1 && line.length > 0 &&
      !e.repeat && Date.now() - edgeShownAt > 400;
    if (e.key === "ArrowRight" && canSwitch && cur === line.length) {
      e.preventDefault(); setAutoplay(false); nextGame().catch(showError); return;
    }
    if (e.key === "ArrowLeft" && canSwitch && cur === 0) {
      e.preventDefault(); setAutoplay(false); prevGame().catch(showError); return;
    }
    const keys = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: line.length };
    if (e.key in keys) { e.preventDefault(); setAutoplay(false); goTo(keys[e.key]); }
  });

  // ---- autoplay --------------------------------------------------------
  // Steps one move per tick at the chosen speed. At the end of a game it holds
  // the final (scoring) position for HOLD_AT_END ticks, then loads the next game
  // in this board's list, wrapping around. Off by default; manual input stops it.
  // It pauses while another slide is showing and resumes on return.
  let autoGen = 0;      // 0 = off; otherwise the id of the running tick chain
  let autoTimer = null;
  let holdLeft = 0;

  function setAutoplay(on) {
    clearTimeout(autoTimer);
    autoTimer = null;
    autoGen = on ? autoGen + 1 || 1 : 0;
    const btn = $("autoplay");
    btn.textContent = on ? "⏸ Pause" : "▶ Autoplay";
    btn.setAttribute("aria-pressed", String(on));
    if (on) {
      if (divergedAt !== null) backToGame();
      holdLeft = HOLD_AT_END;
      schedule(autoGen);
    }
    if (game) setStatus();
  }

  function schedule(gen) {
    autoTimer = setTimeout(() => tick(gen), +$("speed").value);
  }

  async function tick(gen) {
    if (gen !== autoGen) return;
    // Paused while another slide is on screen; resumes where it left off.
    if (!isActive(root)) { schedule(gen); return; }
    if (cur < line.length) {
      goTo(cur + 1);
      holdLeft = HOLD_AT_END;
    } else if (holdLeft > 0) {
      holdLeft--;
    } else {
      try { await nextGame(); } catch (err) { showError(err); setAutoplay(false); return; }
      if (gen !== autoGen) return;
      holdLeft = HOLD_AT_END;
    }
    if (gen === autoGen) schedule(gen);
  }

  async function nextGame() {
    if (!gameList.length) { goTo(0); return; }
    const select = $("game-select");
    const i = gameList.findIndex((g) => g.file === select.value);
    const next = gameList[(i + 1) % gameList.length];
    select.value = next.file;
    await loadFile(next.file);
  }

  async function prevGame() {
    if (!gameList.length) return;
    const select = $("game-select");
    const i = gameList.findIndex((g) => g.file === select.value);
    const prev = gameList[(i <= 0 ? gameList.length : i) - 1];
    select.value = prev.file;
    await loadFile(prev.file);
    goTo(line.length);
  }

  // ---- game list -------------------------------------------------------
  async function loadFile(file) {
    const res = await fetch(asset(gamesDir + file));
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    const g = parseSGF(await res.text());
    const meta = gameList.find((m) => m.file === file);
    if (meta) {
      g.meta = meta;
      // A demo position (`demo: true`) has no score card and opens on its last move,
      // so ← steps back through how it was built.
      if (!meta.demo) g.ending = { rules: meta.rules, scored: !!meta.scored, dead: (meta.dead || []).map((p) => sgfPoint(p, g.size)) };
    }
    loadGame(g);
    if (meta?.demo) goTo(line.length);
  }

  function showError(err) {
    console.error(err);
    $("status").textContent = `Couldn't load games (${err.message}). Serve this folder over HTTP; see README.md.`;
  }

  async function init() {
    const select = $("game-select");
    loadGame(blankGame(9));
    try {
      const res = await fetch(asset(gamesDir + "index.json"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      gameList = await res.json();
      select.innerHTML = `<option value="">Empty board</option>` +
        gameList.map((g) => `<option value="${escapeHtml(g.file)}">${escapeHtml(g.label || `${g.black} vs ${g.white} (${g.result})`)}</option>`).join("");
      select.onchange = () => (select.value ? loadFile(select.value) : Promise.resolve(loadGame(blankGame(9)))).catch(showError);
      const wanted = new URLSearchParams(location.search).get("game");
      const first = gameList.some((g) => g.file === wanted) ? wanted : gameList[0]?.file;
      if (first) { select.value = first; await loadFile(first); }
    } catch (err) {
      select.innerHTML = `<option value="">Empty board</option>`;
      showError(err);
    }
  }

  init();
}

for (const root of document.querySelectorAll(".board-slide")) {
  createBoard(root, root.dataset.games, root.dataset.title);
}
