export type IslandStageId = 1 | 2 | 3;

export type IslandStageArt = {
  width: number;
  height: number;
  cols: number;
  rows: number;
  cells: readonly string[];
  volcanoBox: readonly [number, number, number, number];
  volcanoAnchor: readonly [number, number];
};

export const ISLAND_STAGE_ART: Record<IslandStageId, IslandStageArt> = {
  1: {
    width: 224,
    height: 320,
    cols: 7,
    rows: 10,
    cells: [
      '.GGGGSS',
      'GGGGGGS',
      'GGGGGGS',
      'GGGGGGS',
      'GGGGGGS',
      'SGGGGGS',
      'SGGGGGS',
      'SGGGGSS',
      'SSGGSS.',
      '.SSSS..',
    ],
    volcanoBox: [35, 48, 122, 111],
    volcanoAnchor: [78, 111],
  },
  2: {
    width: 320,
    height: 352,
    cols: 10,
    rows: 11,
    cells: [
      '..GGGGGGSS',
      '.GGGGGGGGS',
      'GGGGGGGGGS',
      'GGGGGGGGGS',
      'GGGGGGGGGS',
      'GGGGGGGGGS',
      'SGGGGGGGGS',
      'SGGGGGGGGS',
      'SGGGGGGGSS',
      'SSGGGGGSS.',
      '.SSSSSSS..',
    ],
    volcanoBox: [99, 80, 186, 143],
    volcanoAnchor: [142, 143],
  },
  3: {
    width: 480,
    height: 512,
    cols: 15,
    rows: 16,
    cells: [
      '..GGGGGGGGGGGSS',
      '.GGGGGGGGGGGGGS',
      'GGGGGGGGGGGGGGS',
      'GGGGGGGGGGGGGGS',
      'GGGGGGGGGGGGGGS',
      'GGGGGGGGGGGGGGS',
      'GGGGGGGGGGGGGGS',
      'GGGGGGGGGGGGGGS',
      'SGGGGGGGGGGGGGS',
      'SGGGGGGGGGGGGSS',
      'SGGGGGGGGGGGGS.',
      'SSGGGGGGGGGGGS.',
      '.SGGGGGGGGGGGS.',
      '.SGGGGGGGGGGSS.',
      '.SSGGGGGGGGSS..',
      '..SSSSSSSSSS...',
    ],
    volcanoBox: [163, 160, 250, 223],
    volcanoAnchor: [206, 223],
  },
};

export const ISLAND_STAGE_IDS: readonly IslandStageId[] = [1, 2, 3];

export const ISLAND_LAST_STAGE: IslandStageId = 3;

export function toIslandStage(stage: number): IslandStageId {
  return Math.min(ISLAND_LAST_STAGE, Math.max(1, Math.round(stage))) as IslandStageId;
}

export function isLandCell(art: IslandStageArt, col: number, row: number) {
  const ch = art.cells[row]?.[col];
  return ch === 'G' || ch === 'S';
}
