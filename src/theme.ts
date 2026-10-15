import { useColorScheme } from 'react-native';

export const theme = {
  pole: '#8A6F52',
  base: '#5C4A38',
  done: '#E9B44C',
  pad: '#6B5641',
  disks: ['#E4572E', '#F3A712', '#A8C686', '#2A9D8F', '#669BBC', '#29335C', '#6D597A', '#B5838D', '#E9C46A', '#264653'],
  ringNames: ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'brown', 'navy'],
  rings: ['#E63946', '#F4A261', '#F6D743', '#4CAF50', '#2A9D8F', '#457B9D', '#8E44AD', '#FF7EB6', '#8D6E63', '#1D3557'],
};

const light = {
  bg: '#F4EFE6',
  card: '#FFFFFF',
  ink: '#2B2B2B',
  muted: '#7A7368',
  accent: '#E4572E',
  overlay: 'rgba(20, 16, 12, 0.55)',
  border: '#E3DACB',
  onAccent: '#FFFFFF',
};

export type Colors = typeof light;

const dark: Colors = {
  bg: '#1C1916',
  card: '#2A2622',
  ink: '#F2EDE4',
  muted: '#A89F92',
  accent: '#E4572E',
  overlay: 'rgba(0, 0, 0, 0.6)',
  border: '#4A433B',
  onAccent: '#FFFFFF',
};

type Scheme = 'light' | 'dark';

const palettes: Record<Scheme, Colors> = { light, dark };

function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useColors(): Colors {
  return palettes[useScheme()];
}

export function themedStyles<T>(make: (colors: Colors) => T): () => T {
  const sheets: Record<Scheme, T> = { light: make(light), dark: make(dark) };
  return function useThemedStyles() {
    return sheets[useScheme()];
  };
}
