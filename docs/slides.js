// Slide show: shows one .slide at a time.
//
// Next:      Space, Page Down, → ↓ (except on board slides)
// Previous:  Shift+Space, Page Up, ← ↑ (except on board slides)
// First/last: Home / End (except on board slides)
// Full screen: F (Esc leaves)
//
// Slides marked data-keys="board" leave the arrow keys, Home and End to the
// board, so moves can be stepped through. Space and Page Up/Down (what most
// presentation clickers send) always change slides.
// The URL hash (#/3) tracks the current slide, so reloads and links keep your place.

const slides = [...document.querySelectorAll(".slide")];
let current = 0;

document.body.classList.add("deck");

// Controls: prev · counter · next · full screen, plus a progress bar.
const bar = document.createElement("div");
bar.className = "deck-progress";
bar.innerHTML = "<span></span>";
const nav = document.createElement("nav");
nav.className = "deck-nav";
nav.setAttribute("aria-label", "Slides");
nav.innerHTML = `
  <button data-act="prev" title="Previous slide (Page Up)" aria-label="Previous slide">‹</button>
  <span class="deck-count" aria-live="polite"></span>
  <button data-act="next" title="Next slide (Page Down / Space)" aria-label="Next slide">›</button>
  <button data-act="fs" title="Full screen (F)" aria-label="Toggle full screen">⛶</button>`;
document.body.append(bar, nav);

nav.addEventListener("click", (e) => {
  const act = e.target.closest("button")?.dataset.act;
  if (act === "prev") go(current - 1);
  if (act === "next") go(current + 1);
  if (act === "fs") toggleFullscreen();
});

function fromHash() {
  const m = location.hash.match(/^#\/(\d+)$/);
  if (m) return parseInt(m[1], 10) - 1;
  const byId = slides.findIndex((s) => s.id && "#" + s.id === location.hash);
  return byId >= 0 ? byId : 0;
}

function show(i) {
  current = Math.max(0, Math.min(slides.length - 1, i));
  slides.forEach((s, j) => s.classList.toggle("active", j === current));
  nav.querySelector(".deck-count").textContent = `${current + 1} / ${slides.length}`;
  nav.querySelector('[data-act="prev"]').disabled = current === 0;
  nav.querySelector('[data-act="next"]').disabled = current === slides.length - 1;
  bar.firstElementChild.style.width = `${((current + 1) / slides.length) * 100}%`;
  window.scrollTo(0, 0);
}

function go(i) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  if (i === current && location.hash) return;
  history.replaceState(null, "", `#/${i + 1}`);
  show(i);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

document.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest("input, select, textarea")) return;

  const board = slides[current].dataset.keys === "board";
  let to = null;
  switch (e.key) {
    case " ": to = e.shiftKey ? current - 1 : current + 1; break;
    case "PageDown": to = current + 1; break;
    case "PageUp": to = current - 1; break;
    case "ArrowRight": case "ArrowDown": if (!board) to = current + 1; break;
    case "ArrowLeft": case "ArrowUp": if (!board) to = current - 1; break;
    case "Home": if (!board) to = 0; break;
    case "End": if (!board) to = slides.length - 1; break;
    case "f": case "F": e.preventDefault(); toggleFullscreen(); return;
  }
  if (to === null) return;
  e.preventDefault();
  go(to);
});

// Swipe left/right on touch screens (not on the board itself).
let touchX = null;
document.addEventListener("touchstart", (e) => {
  touchX = e.target.closest("svg, input, select, button") ? null : e.touches[0].clientX;
}, { passive: true });
document.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 60) go(current + (dx < 0 ? 1 : -1));
  touchX = null;
}, { passive: true });

window.addEventListener("hashchange", () => show(fromHash()));
show(fromHash());

// Lets other scripts ask whether their slide is the one on screen.
export const isActive = (el) => el.closest(".slide")?.classList.contains("active") ?? true;
