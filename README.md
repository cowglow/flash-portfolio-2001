# Flash portfolio archive, 2001–02

Club flyers, logo studies, packaging and web design from Los Angeles, 2001–02.

The originals were Flash 5 `.swf` slideshows (500×375 stage, a loading bar, then still scenes that hold for 49 frames each and loop). Each scene was rendered with [Ruffle](https://ruffle.rs) at 2× and the page replays them at the frame rate each file was authored with.

Static site, served by GitHub Pages from the `main` branch at https://work.cowglow.com/. Each piece has its own page (`/piece/dbe/001/`, with `#3` for a slide) so it can be shared with its own preview image.

Pages are generated and committed: edit `src/pieces.json` or `src/template.html`, then run `npm install` once and `npm run build`. That writes `index.html`, `piece/<series>/<number>/index.html` and `og.jpg` for every piece, and `sitemap.xml`. `npm run serve` previews at http://localhost:8080/ (root-relative paths need a server, not `file://`).

Formatting: `npm install`, then `npm run format` (or `npm run format:check`) runs Prettier over the HTML, CSS and JS.
