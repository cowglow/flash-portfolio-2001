// Cards are rendered by scripts/build.mjs; each one's data-* attributes carry what the player needs.
// URLs: / is the gallery, /piece/<series>/<number>/ (avs-001 → /piece/avs/001/) opens that
// piece in the viewer, and #<n> picks its slide.
const SCENE = 49;
const GALLERY_TITLE = "Flash Portfolio Archive, 2001–02 · Philip Saa";
const pieceTitle = (p) => `${p.t} · Flash Portfolio Archive · Philip Saa`;
const src = (p, i) => `/img/${p.c}_${i + 1}.webp`;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const P = [...document.querySelectorAll("#grid .card")].map((el) => ({
  el,
  c: el.dataset.code,
  t: el.querySelector("h3").textContent,
  k: el.dataset.k,
  n: +el.dataset.slides,
  f: +el.dataset.fps,
  hold: "hold" in el.dataset,
  link: el.querySelector("a"),
  img: el.querySelector(".stage img"),
  ticks: [...el.querySelectorAll(".tl i")],
  cur: -1,
}));
P.forEach((p) => {
  for (let i = 1; i < p.n; i++) new Image().src = src(p, i); // preload
});

const t0 = performance.now();
function frame(now) {
  for (const p of P) {
    const dur = (SCENE / p.f) * 1000,
      el = Math.max(0, now - t0) / dur;
    let s = Math.floor(el),
      prog = el - s;
    if (p.hold) {
      s = Math.min(s, p.n - 1);
      prog = s === p.n - 1 && el >= p.n ? 1 : prog;
    } else s %= p.n;
    if (p.n === 1) prog = ((now - t0) % dur) / dur;
    if (reduce) {
      s = 0;
      prog = 0;
    }
    if (s !== p.cur) {
      p.cur = s;
      p.img.src = src(p, s);
      p.img.alt = `${p.t}, slide ${s + 1}`;
      p.ticks.forEach((t, i) => t.classList.toggle("on", i === s));
    }
    p.ticks[s].style.setProperty("--p", (prog * 100).toFixed(1) + "%");
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.querySelectorAll(".chip").forEach(
  (b) =>
    (b.onclick = () => {
      document
        .querySelectorAll(".chip")
        .forEach((x) => x.setAttribute("aria-pressed", x === b));
      P.forEach(
        (p) => (p.el.hidden = !(b.dataset.k === "all" || p.k === b.dataset.k)),
      );
    }),
);

const $ = (id) => document.getElementById(id);
const lb = $("lb"),
  lbImg = $("lbImg"),
  lbT = $("lbTitle"),
  lbC = $("lbCount"),
  lbCopy = $("lbCopy");
let cur = null, // { p, s } while the viewer is open
  shown = -1, // last piece the viewer showed, for returning focus to its card
  opener = null;

function render() {
  const wasOpen = !lb.hidden;
  if (cur) {
    const p = P[cur.p];
    lbImg.src = src(p, cur.s);
    lbImg.alt = `${p.t}, slide ${cur.s + 1}`;
    lbT.textContent = p.t;
    lbC.textContent = `${p.c} · ${cur.s + 1} / ${p.n}`;
    document.title = pieceTitle(p);
    shown = cur.p;
    if (!wasOpen) {
      opener = document.activeElement;
      lb.hidden = false;
      $("lbNext").focus();
    }
  } else {
    document.title = GALLERY_TITLE;
    if (wasOpen) {
      lb.hidden = true;
      (opener && opener !== document.body ? opener : P[shown].link).focus();
    }
  }
}

const urlFor = (state) =>
  state
    ? `/piece/${P[state.p].c.replace("-", "/")}/${state.s ? `#${state.s + 1}` : ""}`
    : "/";
function go(state, push) {
  cur = state;
  render();
  const url = urlFor(cur);
  if (url !== location.pathname + location.hash)
    history[push ? "pushState" : "replaceState"](null, "", url);
}

// Read the state from the URL: on load, and when Back/Forward moves through history.
function route() {
  const m = location.pathname.match(/^\/piece\/([^/]+)\/([^/]+)\/?$/);
  const pi = m ? P.findIndex((p) => p.c === `${m[1]}-${m[2]}`) : -1;
  if (pi < 0) cur = null;
  else {
    const n = parseInt(location.hash.slice(1), 10) || 1;
    cur = { p: pi, s: Math.min(Math.max(n, 1), P[pi].n) - 1 };
  }
  render();
}
addEventListener("popstate", route);
route();
if (cur) $("lbNext").focus(); // a piece's page loads with the viewer already open

const plainClick = (e) =>
  !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button);
P.forEach((p, i) =>
  p.link.addEventListener("click", (e) => {
    if (!plainClick(e)) return; // let new-tab clicks follow the real link
    e.preventDefault();
    go({ p: i, s: Math.max(p.cur, 0) }, true);
  }),
);
const close = () => go(null, true);
$("lbClose").addEventListener("click", (e) => {
  if (!plainClick(e)) return;
  e.preventDefault();
  close();
});

function step(d) {
  const vis = P.map((p, i) => i).filter((i) => !P[i].el.hidden);
  let { p, s } = cur;
  s += d;
  if (s >= P[p].n || s < 0) {
    let j = vis.indexOf(p);
    j = (j + d + vis.length) % vis.length;
    p = vis[j];
    s = d > 0 ? 0 : P[p].n - 1;
  }
  go({ p, s }, false);
}
$("lbNext").onclick = () => step(1);
$("lbPrev").onclick = () => step(-1);

lbCopy.onclick = async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    lbCopy.textContent = "Copied";
  } catch {
    lbCopy.textContent = "Copy failed";
  }
  setTimeout(() => (lbCopy.textContent = "Copy link"), 1500);
};

lb.addEventListener("click", (e) => {
  if (e.target === lb || e.target.tagName === "FIGURE") close();
});
addEventListener("keydown", (e) => {
  if (lb.hidden) return;
  if (e.key === "Escape") close();
  if (e.key === "ArrowRight") step(1);
  if (e.key === "ArrowLeft") step(-1);
});
