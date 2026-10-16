const path = require('path');

const expoDir = path.dirname(require.resolve('expo/package.json'));
const expoModulesCore = path.dirname(require.resolve('expo-modules-core/package.json', { paths: [expoDir] }));

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.after-env.ts'],
  clearMocks: true,
  testTimeout: 15000,
  transformIgnorePatterns: ['/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|three/))'],
  moduleNameMapper: {
    '^three$': '<rootDir>/node_modules/three/build/three.module.js',
    '^expo-modules-core(/.*)?$': `${expoModulesCore}$1`,
  },
  collectCoverageFrom: ['App.tsx', 'src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
  coverageThreshold: {
    global: { statements: 98, branches: 95, functions: 95, lines: 98 },
  },
};
