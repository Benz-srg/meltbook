// page-flip 2.0.7 ships no type declarations; the parts meltbook uses.
declare module "page-flip" {
  export type FlipSetting = {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    showCover?: boolean;
    usePortrait?: boolean;
    autoSize?: boolean;
    drawShadow?: boolean;
    maxShadowOpacity?: number;
    flippingTime?: number;
    swipeDistance?: number;
    showPageCorners?: boolean;
    mobileScrollSupport?: boolean;
    startPage?: number;
  };
  export class PageFlip {
    constructor(el: HTMLElement, settings: FlipSetting);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    on(event: "flip" | "changeState" | "changeOrientation" | "init", cb: (e: { data: unknown }) => void): this;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    flip(page: number, corner?: "top" | "bottom"): void;
    getCurrentPageIndex(): number;
    destroy(): void;
  }
}
