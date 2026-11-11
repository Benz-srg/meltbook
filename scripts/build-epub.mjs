// Builds one EPUB 3 (reflowable) per volume in content/books/*.json, for ReadAwrite and other e-book
// stores: public/epub/<slug>.epub, plus its cover image public/covers/<slug>.png (also the share
// image). Same content as the web reader: each page in Thai, then the English underneath.
// Images are re-encoded to JPEG/PNG (EPUB core media types). Run: node scripts/build-epub.mjs
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import satori from "satori";
import { createHash } from "node:crypto";
import path from "node:path";
import JSZip from "jszip";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const TONES = { melt: "#f21f04", sky: "#2296d2", ink: "#402722" };
const fonts = [
  { name: "Bagel", data: await readFile(path.join(root, "scripts/fonts/og-bagel-fat-one-latin.ttf")), weight: 400 },
  { name: "Itim", data: await readFile(path.join(root, "scripts/fonts/og-itim.ttf")), weight: 400 },
];
await mkdir(path.join(root, "public/epub"), { recursive: true });
await mkdir(path.join(root, "public/covers"), { recursive: true });

/* The hardcover as an image (1200 × 1800, the 2:3 most stores ask for): cloth colour, title, art. */
async function renderCover(book) {
  const h = (type, style, children) => ({ type, props: { style, children } });
  const art = `data:image/png;base64,${(await readFile(path.join(root, "public", book.coverArt))).toString("base64")}`;
  const svg = await satori(
    h("div", { width: 1200, height: 1800, display: "flex", flexDirection: "column", padding: 110, background: TONES[book.color], color: "#faf9f6", fontFamily: "Itim", position: "relative" }, [
      h("div", { position: "absolute", top: 40, left: 40, width: 1120, height: 1720, border: "6px solid rgba(250,249,246,.35)", borderRadius: 40 }),
      h("div", { display: "flex", fontSize: 56, border: "6px solid #faf9f6", borderRadius: 999, padding: "8px 36px", alignSelf: "flex-start" }, `Vol. ${book.volume}`),
      h("div", { display: "flex", fontFamily: "Bagel", fontSize: 230, lineHeight: 0.9, marginTop: 120 }, "meltbook"),
      h("div", { display: "flex", fontSize: 84, marginTop: 30, lineHeight: 1.2 }, book.series.th),
      h("div", { display: "flex", fontSize: 58, marginTop: 10, opacity: 0.85 }, book.series.en),
      h("div", { display: "flex", flex: 1 }),
      h("div", { display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: 980 }, [
        h("div", { display: "flex", fontSize: 48, opacity: 0.85 }, "Melt.cei · Chiang Rai"),
        { type: "img", props: { src: art, width: 400, height: 455, style: { transform: "rotate(-12deg)", marginRight: 20 } } },
      ]),
    ]),
    { width: 1200, height: 1800, fonts },
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(path.join(root, `public/covers/${book.slug}.png`), png);
  return png;
}

for (const file of (await readdir(path.join(root, "content/books"))).filter((f) => f.endsWith(".json"))) {
const book = JSON.parse(await readFile(path.join(root, "content/books", file), "utf8"));
const coverPng = await renderCover(book);
const LANGS = ["th", "en"];
const MOCK = { th: "ตัวอย่าง", en: "Sample" };
const UI = {
  th: { roast: "ระดับคั่ว", origin: "แหล่งปลูก", process: "โพรเซส", altitude: "ความสูง", notes: "โน้ตรสชาติ", review: "Dream ว่า", acidity: "ความเปรี้ยว", sweetness: "ความหวาน", body: "บอดี้" },
  en: { roast: "Roast", origin: "Origin", process: "Process", altitude: "Altitude", notes: "Tasting notes", review: "Dream says", acidity: "Acidity", sweetness: "Sweetness", body: "Body" },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const zip = new JSZip();
zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
zip.file(
  "META-INF/container.xml",
  `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
);

// images: web paths → files inside the book
const images = new Map();
zip.file("OEBPS/images/cover.png", coverPng);
images.set("cover", { href: "images/cover.png", type: "image/png", cover: true });
async function img(src, { cover = false } = {}) {
  if (images.has(src)) return images.get(src).href;
  const file = path.join(root, "public", src);
  const png = src.endsWith(".png");
  const pipe = sharp(file).resize({ width: cover ? 1600 : 1200, withoutEnlargement: true });
  const data = png ? await pipe.png().toBuffer() : await pipe.jpeg({ quality: 82 }).toBuffer();
  const href = `images/${path.basename(src).replace(/\.\w+$/, png ? ".png" : ".jpg")}`;
  zip.file(`OEBPS/${href}`, data);
  images.set(src, { href, type: png ? "image/png" : "image/jpeg", cover });
  return href;
}

const dots = (v) => "●".repeat(v) + "○".repeat(5 - v);
const mockTag = (l) => `<span class="mock">${MOCK[l]}</span>`;

async function body(p) {
  const out = [];
  if (p.kind === "cover") {
    out.push(`<section class="cover"><h1>meltbook</h1><p class="sub">${esc(book.subtitle.th)}</p><p class="sub en">${esc(book.subtitle.en)}</p>`);
    out.push(`<p class="kicker">${esc(p.kicker.th)} · ${esc(p.kicker.en)}</p><img src="images/cover.png" alt="meltbook ${book.volume}"/></section>`);
    return out.join("");
  }
  if (p.kind === "intro" || p.kind === "bar") out.push(`<img class="hero" src="${await img(p.image)}" alt=""/>`);
  if (p.kind === "bean") out.push(`<img class="art" src="${await img(p.art)}" alt=""/>`);
  for (const l of LANGS) {
    out.push(`<section lang="${l}" xml:lang="${l}"${l === "en" ? ' class="en"' : ""}>`);
    if (p.kind === "intro") {
      out.push(`<h2>${esc(p.heading[l])}</h2>${p.body[l].map((t) => `<p>${esc(t)}</p>`).join("")}`);
      if (l === "en") out.push(`<p class="sign">— ${esc(p.signature)}</p>`);
    } else if (p.kind === "bean") {
      const u = UI[l];
      out.push(`<h2>${esc(p.name[l])}</h2><p class="notes"><b>${u.notes}:</b> ${p.notes[l].map(esc).join(" · ")}</p>`);
      out.push(`<table><tr><th>${u.roast}</th><td>${esc(p.roast[l])}</td></tr><tr><th>${u.origin}</th><td>${esc(p.origin[l])}</td></tr><tr><th>${u.process}</th><td>${esc(p.process[l])}</td></tr>`);
      if (p.altitude) out.push(`<tr><th>${u.altitude}</th><td>${esc(p.altitude)}</td></tr>`);
      out.push(`<tr><th>${u.acidity}</th><td class="dots">${dots(p.scores.acidity)}</td></tr><tr><th>${u.sweetness}</th><td class="dots">${dots(p.scores.sweetness)}</td></tr><tr><th>${u.body}</th><td class="dots">${dots(p.scores.body)}</td></tr></table>`);
      out.push(`<blockquote><p class="who">${u.review} ${p.review.mock ? mockTag(l) : ""}</p><p>“${esc(p.review[l])}”</p></blockquote>`);
    } else if (p.kind === "bar") {
      out.push(`<h2>${esc(p.heading[l])} ${p.mock ? mockTag(l) : ""}</h2><ol>${p.steps[l].map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`);
    } else if (p.kind === "back") {
      out.push(`<h2>${esc(p.heading[l])}</h2><p>${esc(p.address[l])}</p><p><b>${esc(p.hours[l])}</b></p>`);
      if (l === "en") out.push(`<p>${[...p.links, ...(p.social ?? []).map((x) => ({ label: x.name, href: x.href }))].map((x) => `<a href="${esc(x.href)}">${esc(x.label)}</a>`).join(" · ")}</p><p class="small">${esc(book.mockNote.th)}<br/>${esc(book.mockNote.en)}</p>`);
    }
    out.push(`</section>`);
  }
  if (p.kind === "bean") out.push(`<img class="photo" src="${await img(p.photo)}" alt=""/>`);
  return out.join("");
}

const title = (p) => (p.kind === "cover" ? "meltbook" : p.kind === "bean" ? `${p.name.th} · ${p.name.en}` : `${p.heading.th} · ${p.heading.en}`);
const xhtml = (t, b) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="th" xml:lang="th"><head><meta charset="UTF-8"/><title>${esc(t)}</title><link rel="stylesheet" href="style.css"/></head><body>${b}</body></html>`;

const chapters = [];
for (const [k, p] of book.pages.entries()) {
  const href = `p${String(k + 1).padStart(2, "0")}.xhtml`;
  zip.file(`OEBPS/${href}`, xhtml(title(p), await body(p)));
  chapters.push({ href, title: title(p), kind: p.kind });
}

zip.file(
  "OEBPS/style.css",
  `body{font-family:sans-serif;color:#402722;line-height:1.6;margin:0 4%}
h1{color:#f21f04;font-size:3em;margin:.4em 0 0}h2{color:#f21f04;font-size:1.6em;line-height:1.2;margin:.6em 0 .3em}
.sub{font-size:1.2em;font-weight:bold;margin:.2em 0}.en{color:#6b5a52}section.en{border-top:1px dashed #d8d2c8;margin-top:1.2em;padding-top:.4em}
.kicker{font-weight:bold}img{max-width:100%;height:auto}.cover img{width:100%;border-radius:12px;margin-top:1em}
img.hero{width:100%;border-radius:12px}img.art{display:block;height:8em;width:auto;margin:1em auto 0}img.photo{width:60%;display:block;margin:1.2em auto;border-radius:50%}
table{border-collapse:collapse;width:100%;margin:.6em 0}th,td{padding:.25em 0;border-bottom:1px dashed #d8d2c8;text-align:left;vertical-align:top}th{font-weight:normal;color:#6b5a52;width:40%}
.dots{color:#f21f04;letter-spacing:.1em}blockquote{background:#efede8;border-radius:12px;margin:1em 0;padding:.6em 1em}.who{font-weight:bold;color:#f21f04;margin:0}
.mock{font-size:.7em;border:1px solid currentColor;border-radius:1em;padding:0 .5em;color:#6b5a52;font-weight:bold}.sign{text-align:right;font-weight:bold}.small{font-size:.8em;color:#6b5a52}`,
);

const nav = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="th" xml:lang="th"><head><meta charset="UTF-8"/><title>สารบัญ · Contents</title></head><body><nav epub:type="toc" id="toc"><h1>สารบัญ · Contents</h1><ol>${chapters.map((c) => `<li><a href="${c.href}">${esc(c.title)}</a></li>`).join("")}</ol></nav><nav epub:type="landmarks" hidden=""><ol><li><a epub:type="cover" href="p01.xhtml">Cover</a></li><li><a epub:type="bodymatter" href="p02.xhtml">Start</a></li></ol></nav></body></html>`;
zip.file("OEBPS/nav.xhtml", nav);

// a stable id from the content, so rebuilding the same book gives the same identifier
const uid = createHash("sha1").update(JSON.stringify(book)).digest("hex");
const id = `urn:uuid:${uid.slice(0, 8)}-${uid.slice(8, 12)}-5${uid.slice(13, 16)}-a${uid.slice(17, 20)}-${uid.slice(20, 32)}`;
const modified = new Date().toISOString().replace(/\.\d+Z$/, "Z");
const items = [...images.values()].map((m, k) => `<item id="img${k}" href="${m.href}" media-type="${m.type}"${m.cover ? ' properties="cover-image"' : ""}/>`);
const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="th">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${id}</dc:identifier><dc:title>${esc(book.title.th)} — ${esc(book.series.th)}</dc:title>
<dc:creator>${esc(book.author)}</dc:creator><dc:language>th</dc:language><dc:language>en</dc:language>
<dc:publisher>Melt.cei</dc:publisher><dc:description>${esc(book.subtitle.en)}</dc:description><meta property="dcterms:modified">${modified}</meta>
</metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>
${chapters.map((c, k) => `<item id="c${k}" href="${c.href}" media-type="application/xhtml+xml"/>`).join("\n")}
${items.join("\n")}
</manifest>
<spine>${chapters.map((_, k) => `<itemref idref="c${k}"/>`).join("")}</spine>
</package>`;
zip.file("OEBPS/content.opf", opf);

const buf = await zip.generateAsync({ type: "nodebuffer", mimeType: "application/epub+zip", compression: "DEFLATE" });
await writeFile(path.join(root, `public/epub/${book.slug}.epub`), buf);
console.log(`epub/${book.slug}.epub: ${chapters.length} pages, ${images.size} images, ${(buf.length / 1024).toFixed(0)} KB`);
}
