// 섬 게임 빌드. 결과는 JS·그림까지 전부 들어간 HTML 한 장이고, 앱 assets/game/island.html 로 복사된다.
//   npm run game:dev   → 브라우저에서 바로 보기 (같은 와이파이 폰에서도 열림)
//   npm run game:build → assets/game/island.html 갱신
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  base: './',
  resolve: { alias: { '@': path.resolve(here, '..') } },
  plugins: [viteSingleFile()],
  server: { host: true, port: 5180 },
  build: {
    outDir: path.resolve(here, 'dist'),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 3000,
  },
});
