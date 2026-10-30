// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Reanimated shared values are intentionally mutated (.value = …)
    files: ['components/island/island-map.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
]);
