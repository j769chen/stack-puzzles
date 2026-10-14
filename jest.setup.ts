jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ seekTo: jest.fn(() => Promise.resolve()), play: jest.fn() })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

const warn = console.warn;
console.warn = (...args: unknown[]) => {
  if (String(args[0]).startsWith('THREE.Clock: This module has been deprecated')) return;
  warn(...args);
};
