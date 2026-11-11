import { toCanvas } from "html-to-image";

/* Page pictures for the turning page: each HTML page is drawn once into a canvas (twice the CSS
   size on sharp screens, so text stays crisp while it turns) and kept until the language or the
   page size changes. */

const cache = new Map<string, Promise<HTMLCanvasElement>>();

export function snapshot(node: HTMLElement, key: string): Promise<HTMLCanvasElement> {
  const hit = cache.get(key);
  if (hit) return hit;
  const job = toCanvas(node, {
    pixelRatio: Math.min(2, window.devicePixelRatio || 1) * 1.25,
    cacheBust: false,
    // the page's own background is part of the picture; nothing transparent gets through
    backgroundColor: "#faf9f6",
  }).catch((e) => {
    cache.delete(key);
    throw e;
  });
  cache.set(key, job);
  return job;
}

export function forget(prefix = "") {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}
