import type { CSSProperties } from "react";
import { LOGO_D } from "@/lib/logo-path";

/* Melt.cei logo mark, drawn inline (viewBox cropped to the mark). */
export function Logo({ className, style, color = "#F21F04" }: { className?: string; style?: CSSProperties; color?: string }) {
  return (
    <svg viewBox="120 205 720 550" aria-hidden="true" className={className} style={style}>
      <path fill={color} d={LOGO_D} />
    </svg>
  );
}
