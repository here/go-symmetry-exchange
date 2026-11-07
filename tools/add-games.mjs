#!/usr/bin/env node
// Adds game records to a game folder (e.g. docs/games/9x9/pro): copies the SGFs
// in unchanged, appends them to index.json, scores them, and rebuilds the game
// tables in the folder's README.
//
// Usage:
//   node tools/add-games.mjs <games-dir> [options] <file.sgf ...>
//   node tools/add-games.mjs <games-dir> --readme      (only rebuild the README tables)
//
// Options:
//   --root <dir>       name each copy after its path under <dir> (Minigo/931106.sgf ->
//                      pro-minigo-931106.sgf) instead of just its file name
//   --prefix <text>    file name prefix (default "pro-")
//   --rules <rules>    japanese (default) or chinese
//   --about <text>     a one-line note shown under the game menu (only with one file)
//
// A game is skipped, with the reason printed, when:
//   - it isn't 9x9, or is already in the folder
//   - its result isn't a count (resignation, time loss, no result)
//   - its count can't be made to match the recorded result (see score-games.mjs)

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { join, basename, relative } from "path";
import { analyse } from "./score-games.mjs";

const args = process.argv.slice(2);
const dir = args.shift();
if (!dir) { console.error("usage: node tools/add-games.mjs <games-dir> [--root dir] [--prefix p] [--rules r] [--about text] <file.sgf ...> | --readme"); process.exit(1); }

const opt = { prefix: "pro-", rules: "japanese", root: null, about: null, readme: false };
const files = [];
while (args.length) {
  const a = args.shift();
  if (a === "--readme") opt.readme = true;
  else if (a.startsWith("--")) opt[a.slice(2)] = args.shift();
  else files.push(a);
}

const idxPath = join(dir, "index.json");
const idx = existsSync(idxPath) ? JSON.parse(readFileSync(idxPath, "utf8")) : [];
const prop = (s, k) => (s.match(new RegExp("\\b" + k + "\\[([^\\]]*)\\]")) || [, ""])[1].trim();

let added = 0;
for (const f of files) {
  const text = readFileSync(f, "latin1");
  const rel = opt.root ? relative(opt.root, f) : basename(f);
  const name = opt.prefix + rel.replace(/\.sgf$/i, "").replace(/[\/\\_\s]+/g, "-").toLowerCase() + ".sgf";
  const skip = (why) => console.log(`skip ${rel}: ${why}`);

  if (prop(text, "SZ") !== "9") { skip("not 9x9"); continue; }
  if (idx.some((m) => m.file === name) || existsSync(join(dir, name))) { skip(`already in folder as ${name}`); continue; }
  const re = prop(text, "RE");
  if (!/^[BW]\+\d/.test(re)) { skip(`result ${re || "(none)"} is not a count`); continue; }

  const r = analyse(text, opt.rules);
  if (r.method === "estimate" || r.diff !== r.target) { skip(`count doesn't match ${re}: ${r.note}`); continue; }

  copyFileSync(f, join(dir, name));
  const entry = {
    file: name, black: prop(text, "PB"), white: prop(text, "PW"), result: re,
    event: prop(text, "EV"), date: prop(text, "DT"), rules: opt.rules,
    scored: true, dead: r.dead, scoreMethod: r.method, scoreNote: r.note,
  };
  if (opt.about && files.length === 1) entry.about = opt.about;
  idx.push(entry);
  added++;
  console.log(`add  ${rel} -> ${name}: ${re}, ${r.method}, ${r.deadStones} dead stones`);
}

if (added) writeFileSync(idxPath, JSON.stringify(idx, null, 2) + "\n");
writeReadme(dir, idx);
if (!opt.readme) console.log(`${added} added, ${idx.length} games in ${idxPath}`);

// Rebuilds the tables between <!-- games:start --> and <!-- games:end --> in the
// folder's README. Games with an `about` note are listed first, as in the menu.
function writeReadme(dir, idx) {
  const p = join(dir, "README.md");
  if (!existsSync(p)) return;
  const s = readFileSync(p, "utf8");
  const a = s.indexOf("<!-- games:start -->"), b = s.indexOf("<!-- games:end -->");
  if (a < 0 || b < 0) { console.log(`${p}: no <!-- games:start --> / <!-- games:end --> markers; README not updated`); return; }

  const how = (m) => ({ "ownership": m.dead?.length ? "playouts" : "as played", "ownership+result": "playouts, fitted",
    "ownership+neutral": "playouts + neutral point" })[m.scoreMethod] || (m.dead?.length ? "marked by players" : "as played");
  const row = (m) => {
    const t = readFileSync(join(dir, m.file), "latin1");
    const rank = (k) => (prop(t, k) ? ` ${prop(t, k)}` : "");
    const moves = (t.match(/;[BW]\[/g) || []).length;
    return `| ${m.file} | ${m.black}${rank("BR")} | ${m.white}${rank("WR")} | ${m.date || prop(t, "DT")} | ${prop(t, "KM") || "–"} | ${m.result} | ${moves} | ${how(m)} |`;
  };
  const head = "| File | Black | White | Date | Komi | Result | Moves | Scoring |\n| --- | --- | --- | --- | --- | --- | --- | --- |";
  const noted = idx.filter((m) => m.about), rest = idx.filter((m) => !m.about);
  let out = `<!-- games:start -->\n<!-- Built by tools/add-games.mjs from index.json; edit index.json, then run: node tools/add-games.mjs ${dir} --readme -->\n\n`;
  if (noted.length) out += `### With notes (listed first in the menu)\n\n${noted.map((m) => `- **${m.file}**: ${m.about}`).join("\n")}\n\n${head}\n${noted.map(row).join("\n")}\n\n`;
  out += `### ${noted.length ? "More games" : "Games"} (${rest.length})\n\n${head}\n${rest.map(row).join("\n")}\n`;
  writeFileSync(p, s.slice(0, a) + out + s.slice(b));
  console.log(`${p}: tables rebuilt (${idx.length} games)`);
}
