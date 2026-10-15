import { renderHook } from '@testing-library/react-native';
import type { ColorSchemeName } from 'react-native';
import { themedStyles, useColors } from './theme';

let mockScheme: ColorSchemeName = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockScheme }));

const useSheet = themedStyles((colors) => ({ root: { backgroundColor: colors.bg } }));

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
