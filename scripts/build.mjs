// Builds the gallery (index.html), one page per piece (piece/<series>/<number>/index.html)
// from src/template.html and src/pieces.json, plus each piece's 1200×627
// share image, 404.html and sitemap.xml. Output is committed; GitHub Pages serves it as is.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SITE = "https://work.cowglow.com";
const SCENE = 49; // frames each slide holds before the next scene
const root = new URL("../", import.meta.url);
const at = (path) => fileURLToPath(new URL(path, root));

const pieces = JSON.parse(await readFile(at("src/pieces.json"), "utf8"));
const template = await readFile(at("src/template.html"), "utf8");

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const KIND = {
  Flyer: "Club flyer",
  Identity: "Logo and identity work",
  Web: "Web design",
  Print: "Print and packaging",
};
const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;
// avs-001 → piece/avs/001/ (series / number), relative to the site root.
const pieceDir = (p) => `piece/${p.code.replace("-", "/")}/`;
const slideSrc = (p, i) => `/img/${p.code}_${i + 1}.webp`;
const secs = (p) => (SCENE / p.fps).toFixed(SCENE / p.fps < 1 ? 2 : 1);

const AUTHOR = {
  "@type": "Person",
  name: "Philip Saa",
  url: "https://philipsaa.com/",
  sameAs: [
    "https://www.linkedin.com/in/philipsaa/",
    "https://github.com/cowglow",
  ],
};
const ARCHIVE = {
  "@type": "CollectionPage",
  name: "Flash Portfolio Archive, 2001–02",
  url: `${SITE}/`,
};
const LA = { "@type": "Place", name: "Los Angeles" };

const galleryPage = {
  path: "/",
  title: "Flash Portfolio Archive, 2001–02 · Philip Saa",
  description:
    "Club flyers, logo studies, packaging and web design from Los Angeles, 2001–02, recovered from Flash 5.",
  image: "/img/og.jpg",
  imageAlt:
    "Contact sheet of eight pieces: club flyers, the dbe and DASH logos, and two websites.",
};
galleryPage.jsonld = {
  "@context": "https://schema.org",
  ...ARCHIVE,
  description: galleryPage.description,
  image: SITE + galleryPage.image,
  inLanguage: "en",
  author: AUTHOR,
  temporalCoverage: "2001/2002",
  locationCreated: LA,
  hasPart: pieces.map((p) => ({
    "@type": "VisualArtwork",
    name: p.title,
    url: `${SITE}/${pieceDir(p)}`,
  })),
};

const piecePage = (p) => {
  const page = {
    path: `/${pieceDir(p)}`,
    title: `${p.title} · Flash Portfolio Archive · Philip Saa`,
    description: `${KIND[p.kind]} from Los Angeles, 2001–02, recovered from ${p.code}.swf (Flash 5, ${plural(p.slides, "slide")}).`,
    image: `/${pieceDir(p)}og.jpg`,
    imageAlt: `${p.title}, slide 1`,
  };
  page.jsonld = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: p.title,
    url: SITE + page.path,
    description: page.description,
    image: Array.from({ length: p.slides }, (_, i) => SITE + slideSrc(p, i)),
    artform: KIND[p.kind],
    creator: AUTHOR,
    temporalCoverage: "2001/2002",
    locationCreated: LA,
    isPartOf: ARCHIVE,
  };
  return page;
};

const head = (page) => `<title>${esc(page.title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <link rel="canonical" href="${SITE}${page.path}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Philip Saa" />
    <meta property="og:url" content="${SITE}${page.path}" />
    <meta property="og:title" content="${esc(page.title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:image" content="${SITE}${page.image}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="627" />
    <meta property="og:image:alt" content="${esc(page.imageAlt)}" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">
      ${JSON.stringify(page.jsonld)}
    </script>`;

// Cards carry what app.js needs (code, slide count, fps) as data attributes.
const card = (
  p,
) => `<article class="card" data-k="${p.kind}" data-code="${p.code}" data-slides="${p.slides}" data-fps="${p.fps}"${p.hold ? " data-hold" : ""}>
  <a href="/${pieceDir(p)}" aria-label="Open ${esc(p.title)}">
    <div class="stage"><img alt="${esc(p.title)}, slide 1" src="${slideSrc(p, 0)}" width="1000" height="750" loading="lazy" /></div>
  </a>
  <div class="tl" aria-hidden="true">${"<i></i>".repeat(p.slides)}</div>
  <div class="meta"><h3>${esc(p.title)}</h3><span class="kind">${p.kind}</span></div>
  <div class="spec"><span>${p.code}.swf</span><span>${plural(p.slides, "slide")}</span><span>${p.fps} fps · ${secs(p)} s each</span><span>${p.kb} KB</span></div>
</article>`;

// The viewer is rendered open on a piece's page, so it reads correctly before (or without) JavaScript.
const lightbox = (
  p,
) => `<div class="lb" id="lb"${p ? "" : " hidden"} role="dialog" aria-modal="true" aria-labelledby="lbTitle">
  <div class="lb-top">
    <h2 id="lbTitle">${p ? esc(p.title) : ""}</h2>
    <div class="lb-actions"><button id="lbCopy" type="button">Copy link</button><a class="btn" id="lbClose" href="/">Close</a></div>
  </div>
  <figure><img id="lbImg" alt="${p ? `${esc(p.title)}, slide 1` : ""}"${p ? ` src="${slideSrc(p, 0)}"` : ""} /></figure>
  <div class="lb-bot">
    <button id="lbPrev" type="button">← Previous</button>
    <span class="count" id="lbCount">${p ? `${p.code} · 1 / ${p.slides}` : ""}</span>
    <button id="lbNext" type="button">Next →</button>
  </div>
</div>`;

const cards = pieces.map(card).join("\n");
const totalSlides = pieces.reduce((n, p) => n + p.slides, 0);
const render = (page, piece) =>
  template
    .replace("<!-- @head -->", head(page))
    .replace("<!-- @files -->", pieces.length)
    .replace("<!-- @slides -->", totalSlides)
    .replace("<!-- @cards -->", cards)
    .replace("<!-- @lightbox -->", lightbox(piece));

// Share image: slide 1 centred on the archive's paper colour, with a hairline border.
async function shareImage(p, out) {
  const W = 1200,
    H = 627,
    h = H - 80,
    w = Math.round((h * 4) / 3);
  const x = Math.round((W - w) / 2),
    y = Math.round((H - h) / 2);
  const slide = await sharp(at(`img/${p.code}_1.webp`))
    .resize(w, h)
    .toBuffer();
  const border = {
    create: { width: w + 2, height: h + 2, channels: 3, background: "#cfd4d5" },
  };
  await sharp({
    create: { width: W, height: H, channels: 3, background: "#eceeee" },
  })
    .composite([
      { input: await sharp(border).png().toBuffer(), left: x - 1, top: y - 1 },
      { input: slide, left: x, top: y },
    ])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(out);
}

await writeFile(at("index.html"), render(galleryPage, null));
for (const p of pieces) {
  await mkdir(at(pieceDir(p)), { recursive: true });
  await writeFile(at(`${pieceDir(p)}index.html`), render(piecePage(p), p));
  await shareImage(p, at(`${pieceDir(p)}og.jpg`));
}

// GitHub Pages serves 404.html for any address that has no file.
const notFound = await readFile(at("src/404.html"), "utf8");
await writeFile(
  at("404.html"),
  notFound.replace(
    "<!-- @list -->",
    pieces
      .map(
        (p) =>
          `<li><a href="/${pieceDir(p)}">${esc(p.title)} <span>${p.code}</span></a></li>`,
      )
      .join("\n"),
  ),
);

const today = new Date().toISOString().slice(0, 10);
const urls = ["/", ...pieces.map((p) => `/${pieceDir(p)}`)];
await writeFile(
  at("sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`,
);

console.log(
  `Built gallery + ${pieces.length} piece pages, ${totalSlides} slides.`,
);
