import * as THREE from "three";
import { curl, type CurlState } from "./curl";

/* Draws the one page that is turning, over the static HTML pages, in WebGL.

   - The canvas covers the book plus a margin, so a lifted page never gets clipped.
   - The camera is set so that the table (z = 0) maps 1:1 to CSS pixels: a flat page sits exactly on
     its HTML twin, and lifting it brings it gently towards the reader (mild perspective).
   - Front and back are snapshots of the real pages. The back is sampled mirrored, so its text reads
     the right way round once the page has turned over.
   - Light: a soft sky light from above-left. A page lying flat gets exactly 1.0, so it matches the
     HTML colour for colour; as it bends, the side away from the light darkens and a faint sheen
     runs along the curl. */

const NX = 40;
const NY = 20;

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG = /* glsl */ `
  uniform sampler2D front;
  uniform sampler2D back;
  uniform vec3 light;
  uniform float flatDot;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vec3 n = normalize(vNormal);
    vec4 c;
    if (gl_FrontFacing) {
      c = texture2D(front, vUv);
    } else {
      n = -n;
      c = texture2D(back, vec2(1.0 - vUv.x, vUv.y));
    }
    // n points away from the table; the view is from straight above (+z)
    float d = max(dot(n, light), 0.0) / flatDot;
    float shade = mix(0.72, 1.0, clamp(d, 0.0, 1.0));
    float sheen = pow(clamp(d - 0.98, 0.0, 0.2) * 5.0, 2.0) * 0.06;
    gl_FragColor = vec4(c.rgb * shade + sheen, 1.0);
  }
`;

export class FlipGL {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private geo = new THREE.BufferGeometry();
  private mat: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private grid = new Float32Array((NX + 1) * (NY + 1) * 3);
  private pos: THREE.BufferAttribute;
  private blank: THREE.Texture;
  private W = 1;
  private H = 1;
  private pad = 0;
  /** +1: the page lies right of the spine (turns leftwards); -1: left of it (turns rightwards) */
  private dir: 1 | -1 = 1;
  private spineX = 0;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, premultipliedAlpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    // snapshots are already sRGB pixels: pass them through untouched so colours match the HTML
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    const light = new THREE.Vector3(-0.28, 0.32, 1).normalize();
    this.blank = new THREE.DataTexture(new Uint8Array([250, 249, 246, 255]), 1, 1);
    this.blank.needsUpdate = true;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
      uniforms: { front: { value: this.blank }, back: { value: this.blank }, light: { value: light }, flatDot: { value: light.z } },
    });
    this.pos = new THREE.BufferAttribute(new Float32Array(this.grid.length), 3);
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute("position", this.pos);
    this.geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((NX + 1) * (NY + 1) * 2), 2));
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  /** Size the canvas to the book (CSS px) plus `pad` on every side. */
  resize(bookW: number, bookH: number, pageW: number, pad: number) {
    this.W = pageW;
    this.H = bookH;
    this.pad = pad;
    const cw = bookW + pad * 2;
    const ch = bookH + pad * 2;
    this.renderer.setSize(cw, ch, false);
    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    // world: x right and y up in CSS px, origin at the canvas centre; the table at z = 0 maps 1:1
    const dist = ch * 9;
    this.camera.fov = (2 * Math.atan(ch / 2 / dist) * 180) / Math.PI;
    this.camera.aspect = cw / ch;
    this.camera.near = dist * 0.2;
    this.camera.far = dist * 2;
    this.camera.position.set(0, 0, dist);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.originX = -cw / 2 + pad;
    this.originY = ch / 2 - pad;
  }
  private originX = 0;
  private originY = 0;

  /**
   * Which page turns: its spine x (CSS px from the book's left edge), the side it lies on, and its
   * two faces (null = plain paper).
   */
  setLeaf(spineX: number, dir: 1 | -1, front: THREE.Texture | null, back: THREE.Texture | null) {
    this.spineX = spineX;
    this.dir = dir;
    this.mat.uniforms.front.value = front ?? this.blank;
    this.mat.uniforms.back.value = back ?? this.blank;
    // texture u runs from the page's left edge to its right edge as seen when it lies flat
    const uv = this.geo.getAttribute("uv") as THREE.BufferAttribute;
    const a = uv.array as Float32Array;
    let k = 0;
    for (let j = 0; j <= NY; j++)
      for (let i = 0; i <= NX; i++) {
        a[k++] = dir === 1 ? i / NX : 1 - i / NX;
        a[k++] = 1 - j / NY;
      }
    uv.needsUpdate = true;
    // triangles wound so the side facing up at rest is the front
    const idx: number[] = [];
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const p = j * (NX + 1) + i;
        const q = p + NX + 1;
        if (dir === 1) idx.push(p, q, p + 1, p + 1, q, q + 1);
        else idx.push(p, p + 1, q, p + 1, q + 1, q);
      }
    this.geo.setIndex(idx);
  }

  /** Bend the page to `s` and draw it. */
  draw(s: CurlState) {
    curl(this.grid, s, this.W, this.H, NX, NY);
    const a = this.pos.array as Float32Array;
    for (let k = 0; k < this.grid.length; k += 3) {
      a[k] = this.originX + this.spineX + this.dir * this.grid[k];
      a[k + 1] = this.originY - this.grid[k + 1];
      a[k + 2] = this.grid[k + 2];
    }
    this.pos.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.renderer.render(this.scene, this.camera);
  }

  clear() {
    this.renderer.clear();
  }

  /** A texture from a page snapshot. */
  texture(canvas: HTMLCanvasElement) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
    this.blank.dispose();
    this.renderer.dispose();
  }
}
