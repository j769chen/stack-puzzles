// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "dist-dev/*", "coverage/*"],
  },
  {
    files: ["src/three/**/*.tsx", "src/games/**/*Board.tsx"],
    rules: { "react/no-unknown-property": "off" },
  },
]);
