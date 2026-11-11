/* The shape of a turning page, as a grid of points. Pure maths, no three.js, so it can be checked on
   its own.

   The page is a sheet anchored at the spine (local x = 0) and reaching to its outer edge (x = W).
   Walking across the sheet from the spine, its surface rises at an angle a(s) between 0 (lying flat
   on the right) and π (lying flat on the left). The spine end turns at `spine`, the outer edge at
   `edge`, and the angle eases from one to the other across the sheet, so the paper bends in one
   continuous curve instead of folding along a line. Positions come from adding up the little
   steps (cos a, sin a), so the length of the paper never changes.

   A corner drag adds `twist`: rows nearer the held corner turn further, so that corner lifts first.
   Every angle stays inside [0, π], so no part of the page ever goes below the table. */

export type CurlState = {
  /** angle of the spine end of the sheet, 0…π */
  spine: number;
  /** angle of the outer edge, 0…π */
  edge: number;
  /** extra turn at the held corner (radians, ≥ 0) */
  twist: number;
  /** which corner is held: 0 = top, 1 = bottom, 0.5 = the middle of the edge */
  corner: number;
};

export const FLAT: CurlState = { spine: 0, edge: 0, twist: 0, corner: 0.5 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Fills `out` with (x, y, z) for a (nx+1) × (ny+1) grid; x across from the spine, y down from the top,
 * z up off the table. Sizes in CSS pixels.
 */
export function curl(out: Float32Array, s: CurlState, W: number, H: number, nx: number, ny: number) {
  const ds = W / nx;
  let k = 0;
  let prevA = 0;
  for (let j = 0; j <= ny; j++) {
    const v = j / ny; // 0 at the top edge, 1 at the bottom
    // how close this row is to the held corner: 1 at the corner, 0 at the far corner
    const near = 1 - Math.abs(v - s.corner);
    let x = 0;
    let z = 0;
    prevA = clamp(s.spine, 0, Math.PI);
    for (let i = 0; i <= nx; i++) {
      if (i > 0) {
        const u = (i - 0.5) / nx; // the middle of this step
        // ease from the spine angle to the edge angle; most of the bend sits in the outer half
        const f = u * u * (3 - 2 * u) * 0.35 + Math.pow(u, 1.6) * 0.65;
        const a = clamp(s.spine + (s.edge - s.spine) * f + s.twist * near * near * u * u, 0, Math.PI);
        x += Math.cos(a) * ds;
        z += Math.sin(a) * ds;
        prevA = a;
      }
      out[k++] = x;
      out[k++] = v * H;
      out[k++] = z;
    }
  }
  return prevA;
}

/** Where the outer edge's middle lands, projected on the table (for the shadow it casts). */
export function edgeX(s: CurlState, W: number, steps = 24) {
  const ds = W / steps;
  let x = 0;
  for (let i = 0; i < steps; i++) {
    const u = (i + 0.5) / steps;
    const f = u * u * (3 - 2 * u) * 0.35 + Math.pow(u, 1.6) * 0.65;
    x += Math.cos(clamp(s.spine + (s.edge - s.spine) * f, 0, Math.PI)) * ds;
  }
  return x;
}

/* The motion of a turn, from progress t (0…1, time or drag) to a shape. The outer edge leads, the
   spine follows a little behind and lands last, which reads as the paper settling. A hard cover
   barely bends: spine and edge move together. */
export function turnAt(t: number, stiff: boolean): CurlState {
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  if (stiff) {
    const a = Math.PI * ease(clamp(t, 0, 1));
    return { spine: a, edge: Math.min(Math.PI, a + 0.06 * Math.sin(Math.PI * t)), twist: 0, corner: 0.5 };
  }
  const edge = Math.PI * ease(clamp(t / 0.86, 0, 1));
  const spine = Math.PI * ease(clamp((t - 0.1) / 0.9, 0, 1));
  return { spine, edge, twist: 0, corner: 0.5 };
}

/* While dragging: the pointer holds the outer edge, so the edge angle is the one whose projection
   lands under the pointer; the spine lags behind it; the corner lifts by how far the pointer is
   from the middle of the page, up or down. */
export function dragAt(px: number, py: number, W: number, H: number, stiff: boolean): CurlState {
  const edge = Math.acos(clamp(px / W, -1, 1));
  const spine = stiff ? edge : edge * Math.pow(edge / Math.PI, 0.7) * 0.92;
  const corner = clamp(py / H, 0, 1);
  const off = Math.abs(corner - 0.5) * 2; // 0 middle … 1 at a corner
  const twist = stiff ? 0 : 0.32 * off * Math.sin(edge);
  return { spine, edge, twist, corner: corner < 0.5 ? 0 : 1 };
}
