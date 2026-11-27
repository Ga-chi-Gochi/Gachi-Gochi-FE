// gachi-island 숲 탐험 에셋을 Vite 로 묶어 ForestExplore 에 넘긴다.
// 설명: gachi-island/assets/scenes/forest-explore/README.md
import {
  ForestExplore,
  loadAssetsDirect,
  loadItem,
  type Track,
} from './forestExplore';
import { FOREST_FRAME } from './shape';

import forestUrl from '../assets/forest-explore/forest.png';
import itemUrl from '../assets/forest-explore/items/placeholder.png';

import adultKit from '../assets/forest-explore/characters/adult/kit.png';
import adultShadow from '../assets/forest-explore/characters/adult/shadow.png';
import adultIntro from '../assets/forest-explore/characters/adult/intro.json';
import adultLoop from '../assets/forest-explore/characters/adult/loop.json';
import adultFind from '../assets/forest-explore/characters/adult/find.json';
import adultLeave from '../assets/forest-explore/characters/adult/leave.json';

import juvenileKit from '../assets/forest-explore/characters/juvenile/kit.png';
import juvenileShadow from '../assets/forest-explore/characters/juvenile/shadow.png';
import juvenileIntro from '../assets/forest-explore/characters/juvenile/intro.json';
import juvenileLoop from '../assets/forest-explore/characters/juvenile/loop.json';
import juvenileFind from '../assets/forest-explore/characters/juvenile/find.json';
import juvenileLeave from '../assets/forest-explore/characters/juvenile/leave.json';

import questionSheet from '../assets/animations/fx/question/sheet.png';
import bangSheet from '../assets/animations/fx/panic-bang/sheet.png';
import leafSheet from '../assets/animations/fx/leaf/sheet.png';
import fireworkA from '../assets/animations/fx/firework-a/sheet.png';
import fireworkB from '../assets/animations/fx/firework-b/sheet.png';
import fireworkC from '../assets/animations/fx/firework-c/sheet.png';

export type ForestExploreCharacter = 'adult' | 'juvenile';

export { FOREST_FRAME };
export const FOREST_EXPLORE_CANVAS = { w: 260, h: 172, forestX: 34, forestY: 30 } as const;

/** 탐험 판 왼쪽 위 = 숲 자리 − (forestX, forestY) */
export function forestExploreOrigin() {
  return {
    x: FOREST_FRAME.x - FOREST_EXPLORE_CANVAS.forestX,
    y: FOREST_FRAME.y - FOREST_EXPLORE_CANVAS.forestY,
  };
}

const packs: Record<
  ForestExploreCharacter,
  { kit: string; shadow: string; tracks: Record<'intro' | 'loop' | 'find' | 'leave', Track> }
> = {
  adult: {
    kit: adultKit,
    shadow: adultShadow,
    tracks: {
      intro: adultIntro as Track,
      loop: adultLoop as Track,
      find: adultFind as Track,
      leave: adultLeave as Track,
    },
  },
  juvenile: {
    kit: juvenileKit,
    shadow: juvenileShadow,
    tracks: {
      intro: juvenileIntro as Track,
      loop: juvenileLoop as Track,
      find: juvenileFind as Track,
      leave: juvenileLeave as Track,
    },
  },
};

/** 성장 레벨 → 숲 탐험 캐릭터 (juvenile=어린 귤새, adult=어른 귤새) */
export function forestExploreCharacter(level: number): ForestExploreCharacter {
  return level >= 4 ? 'adult' : 'juvenile';
}

export async function createForestExplore(character: ForestExploreCharacter, withItem = true) {
  const pack = packs[character];
  const A = await loadAssetsDirect({
    forest: forestUrl,
    kit: pack.kit,
    shadow: pack.shadow,
    question: questionSheet,
    bang: bangSheet,
    leaf: leafSheet,
    fireworkA,
    fireworkB,
    fireworkC,
  });
  const item = withItem ? await loadItem(itemUrl) : null;
  return new ForestExplore(A, pack.tracks, item);
}

export { forestUrl };
