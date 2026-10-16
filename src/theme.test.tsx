import { renderHook } from '@testing-library/react-native';
import type { ColorSchemeName } from 'react-native';
import { themedStyles, useColors } from './theme';

let mockScheme: ColorSchemeName = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockScheme }));

const useSheet = themedStyles((colors) => ({ root: { backgroundColor: colors.bg } }));

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function inScheme(scheme: ColorSchemeName) {
  mockScheme = scheme;
}

describe('theme', () => {
  it.each([
    ['light', '#F4EFE6', '#2B2B2B'],
    ['dark', '#1C1916', '#F2EDE4'],
    ['unspecified', '#F4EFE6', '#2B2B2B'],
  ] as const)('uses the %s palette', async (scheme, bg, ink) => {
    inScheme(scheme);
    const { result } = await renderHook(() => useColors());
    expect(result.current).toMatchObject({ bg, ink });
  });

  it.each(['light', 'dark'] as const)('keeps text and stars readable in the %s palette', async (scheme) => {
    inScheme(scheme);
    const { result } = await renderHook(() => useColors());
    const colors = result.current;
    for (const surface of [colors.bg, colors.card]) {
      for (const text of [colors.ink, colors.muted, colors.accent]) expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
      for (const star of [colors.star, colors.muted]) expect(contrast(star, surface)).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('builds each themed style sheet once per scheme', async () => {
    inScheme('dark');
    const dark = await renderHook(() => useSheet());
    expect(dark.result.current.root.backgroundColor).toBe('#1C1916');
    const again = await renderHook(() => useSheet());
    expect(again.result.current).toBe(dark.result.current);

    inScheme('light');
    const light = await renderHook(() => useSheet());
    expect(light.result.current.root.backgroundColor).toBe('#F4EFE6');
  });
});
