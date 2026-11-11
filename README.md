# meltbook

An e-book of the beans Melt.cei (Chiang Rai) has brewed, with tasting notes from barista Dream.
Thai and English. Styled in the Melt.cei brand (colours, Bagel Fat One / Glacial Indifference / Itim / Mali, logo).

- **Web reader**: Next.js, one 3:4 page at a time (buttons, arrow keys, swipe, `#page` links).
- **EPUB 3** for ReadAwrite: `pnpm epub` writes `public/meltbook.epub` (also runs before every build).
- **Content**: `content/book.json` feeds both. Fields with `"mock": true` are placeholder text until the
  real posts from IG @melt.cei are imported.

```sh
pnpm install
pnpm dev     # http://localhost:3000
pnpm epub    # build the EPUB only
```
