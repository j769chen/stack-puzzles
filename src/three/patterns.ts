import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshStandardMaterial,
  RGBAFormat,
  SRGBColorSpace,
} from 'three';
import { theme } from '../theme';
import { shared } from './shared';

const WIDTH = 128;
const HEIGHT = 32;

type Pattern = (u: number, v: number) => boolean;

const spokes = (count: number): Pattern => (u) => (u * count) % 1 < 0.35;
const band: Pattern = (_u, v) => Math.abs(v - 0.25) < 0.07 || Math.abs(v - 0.75) < 0.07;

export const PATTERNS: Pattern[] = [
  () => false,
  spokes(3),
  spokes(6),
  spokes(12),
  band,
  (u, v) => (u * 12) % 1 < 0.4 && (v * 4) % 1 < 0.4,
  (u, v) => (u * 8 + v) % 1 < 0.4,
  (u, v) => band(u, v) || spokes(3)(u, v),
  (u, v) => (Math.floor(u * 6) + Math.floor(v * 2)) % 2 === 0,
  (u, v) => band(u, v) || spokes(12)(u, v),
];

export function patternPixels(colorIndex: number): Uint8Array {
  const base = new Color(theme.rings[colorIndex]).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  const light = 0.299 * base.r + 0.587 * base.g + 0.114 * base.b > 0.55;
  const mark = light ? 0.12 : 0.95;
  const pattern = PATTERNS[colorIndex];
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const marked = pattern((x + 0.5) / WIDTH, (y + 0.5) / HEIGHT);
      const i = (y * WIDTH + x) * 4;
      pixels[i] = Math.round(255 * (marked ? mark : base.r));
      pixels[i + 1] = Math.round(255 * (marked ? mark : base.g));
      pixels[i + 2] = Math.round(255 * (marked ? mark : base.b));
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}

const materials = new Map<number, MeshStandardMaterial>();

export function patternMaterial(colorIndex: number): MeshStandardMaterial {
  let material = materials.get(colorIndex);
  if (!material) {
    const map = shared(new DataTexture(patternPixels(colorIndex), WIDTH, HEIGHT, RGBAFormat));
    map.colorSpace = SRGBColorSpace;
    map.magFilter = LinearFilter;
    map.minFilter = LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.needsUpdate = true;
    material = shared(new MeshStandardMaterial({ map, roughness: 0.3 }));
    materials.set(colorIndex, material);
  }
  return material;
}
