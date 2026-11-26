import type { Anim } from './player';

const animJson = import.meta.glob('../assets/anims/*/anim.json', { eager: true, import: 'default' }) as Record<string, Anim>;
const timelineJson = import.meta.glob('../assets/ash-cover/timeline.json', { eager: true, import: 'default' });
const linksJson = import.meta.glob('../assets/links.json', { eager: true, import: 'default' });

export const ANIM_URLS = import.meta.glob('../assets/anims/*/*.png', { eager: true, import: 'default' }) as Record<
  string,
  string
>;

export const ANIMS: Record<string, Anim> = {};
for (const a of Object.values(animJson)) ANIMS[a.id] = a;

export function anim(id: string): Anim {
  const a = ANIMS[id];
  if (!a) throw new Error(`anim ${id} 없음`);
  return a;
}

export type AshItem = [string, number, number, number];

export type AshTimeline = {
  phases: { rumble: number; erupt: number; cover: number; covered: number; clear: number; done: number };
  swap_ms: number;
  volcano: string;
  volcano_start_ms: number;
  solid: { color: string; from_ms: number; to_ms: number };
  origin: [number, number];
  box: [number, number, number, number];
  ms: number[];
  frames: AshItem[][];
};

export type PanicStage = 'egg' | 'juvenile' | 'adult';
export type PanicFx = 'fx-panic-bang' | 'fx-panic-sweat';

type Links = {
  volcano: { key: string; kind: 'rest' | 'erupt' }[];
  panic: {
    stages: Record<PanicStage, { startle: string[]; panic: string[] }>;
    attach: Record<PanicStage, Record<PanicFx, [number, number]>>;
  };
};

export const ASH = Object.values(timelineJson)[0] as AshTimeline;
const LINKS = Object.values(linksJson)[0] as Links;

export const VOLCANO_REST = 'volcano-idle-a';
export const VOLCANO_ERUPT = 'volcano-erupt-b';

const PANIC_VERSION = 1;

export function panicStartle(stage: PanicStage) {
  return LINKS.panic.stages[stage].startle[0];
}

export function panicRun(stage: PanicStage) {
  const list = LINKS.panic.stages[stage].panic;
  return list[Math.min(PANIC_VERSION, list.length - 1)];
}

export function panicAttach(stage: PanicStage, fx: PanicFx) {
  return LINKS.panic.attach[stage][fx];
}
