// 섬 게임 시작점. 캔버스는 기기 픽셀 크기로 만들고 CSS로 화면 크기에 맞춘다 (도트가 번지지 않게).
import Phaser from 'phaser';

import { IslandScene } from './scene';

const dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));

function viewport() {
  // 웹뷰가 아직 크기를 못 받은 순간(0×0)에 WebGL을 만들면 실패하므로 기본값을 쓴다
  return { w: window.innerWidth || 360, h: window.innerHeight || 640 };
}

const v = viewport();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#2ca6a4',
  pixelArt: true,
  roundPixels: false,
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.NONE,
    width: Math.round(v.w * dpr),
    height: Math.round(v.h * dpr),
    zoom: 1 / dpr,
  },
  input: { activePointers: 3 },
  callbacks: {
    preBoot: (g) => g.registry.set('dpr', dpr),
  },
  scene: [IslandScene],
});

window.addEventListener('resize', () => {
  const n = viewport();
  if (!n.w || !n.h) return;
  game.scale.resize(Math.round(n.w * dpr), Math.round(n.h * dpr));
});

(window as unknown as { __game?: Phaser.Game }).__game = game;
