import { LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, TorusGeometry } from 'three';
import { theme } from '../theme';
import { PATTERNS, patternMaterial, patternPixels } from './patterns';

const BLACKISH = Math.round(255 * 0.12);
const WHITEISH = Math.round(255 * 0.95);
const marks = (pixels: Uint8Array, mark: number) => {
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === mark && pixels[i + 1] === mark && pixels[i + 2] === mark) count++;
  return count;
};
const shape = (pattern: (typeof PATTERNS)[number], keep = (_v: number) => true) => {
  let bits = '';
  for (let y = 0; y < 32; y++) {
    const v = (y + 0.5) / 32;
    if (keep(v)) for (let x = 0; x < 128; x++) bits += pattern((x + 0.5) / 128, v) ? '1' : '0';
  }
  return bits;
};
const outside = (v: number) => Math.abs(v - Math.round(v)) < 1 / 12;

describe('color-blind patterns', () => {
  it('has a pattern for every ring color', () => {
    expect(PATTERNS).toHaveLength(theme.rings.length);
  });

  it('draws a different pattern for every color', () => {
    expect(new Set(PATTERNS.map((pattern) => shape(pattern))).size).toBe(PATTERNS.length);
  });

  it('marks every color but red on the outside of the tube, which stays in view between stacked rings', () => {
    const { position, uv } = new TorusGeometry(1, 0.25, 8, 8).attributes;
    expect([uv!.getY(0), position!.getX(0)]).toEqual([0, 1.25]);
    expect(PATTERNS.map((pattern) => shape(pattern, outside).includes('1'))).toEqual([false, ...Array(9).fill(true)]);
  });

  it('keeps every pattern different on the outside of the tube', () => {
    expect(new Set(PATTERNS.map((pattern) => shape(pattern, outside))).size).toBe(PATTERNS.length);
  });

  it('leaves red plain and marks the others in a contrasting shade', () => {
    expect(marks(patternPixels(0), BLACKISH) + marks(patternPixels(0), WHITEISH)).toBe(0);
    expect(marks(patternPixels(2), BLACKISH)).toBeGreaterThan(0);
    expect(marks(patternPixels(9), WHITEISH)).toBeGreaterThan(0);
  });

  it('builds one sRGB texture material per color', () => {
    const material = patternMaterial(3);
    expect(patternMaterial(3)).toBe(material);
    expect(material.map!.colorSpace).toBe(SRGBColorSpace);
    expect((material.map!.image as { width: number }).width).toBe(128);
  });

  it('smooths patterns up close and mipmaps them at a distance so they do not shimmer', () => {
    const { map } = patternMaterial(5);
    expect(map!.magFilter).toBe(LinearFilter);
    expect(map!.minFilter).toBe(LinearMipmapLinearFilter);
    expect(map!.generateMipmaps).toBe(true);
    expect([map!.wrapS, map!.wrapT]).toEqual([RepeatWrapping, RepeatWrapping]);
  });

  it('draws patterns that repeat seamlessly around the ring and the tube', () => {
    for (const pattern of PATTERNS) {
      for (let i = 0; i < 64; i++) {
        const t = (i + 0.5) / 64;
        expect(pattern(0.001, t)).toBe(pattern(1.001, t));
        expect(pattern(t, 0.001)).toBe(pattern(t, 1.001));
      }
    }
  });
});
