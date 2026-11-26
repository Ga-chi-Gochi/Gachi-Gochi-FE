// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'game/dist/*', 'assets/game/*'],
  },
  {
    // 섬 게임(Phaser)은 Phaser.Math 처럼 기본 내보내기로 쓰는 게 공식 사용법이다
    files: ['game/**/*.ts'],
    rules: {
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    // Reanimated shared values are intentionally mutated (.value = …)
    files: ['components/island/island-map.tsx', 'components/island/island-camera.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
]);
