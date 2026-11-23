// RN 앱 ↔ 섬 게임 메시지.
// - 폰(웹뷰): 게임 → RN 은 window.ReactNativeWebView.postMessage, RN → 게임 은 injectJavaScript 로 window.__fromRN(문자열) 호출
// - 웹(iframe): 둘 다 postMessage
// 브라우저에서 단독으로 열면 보낼 곳이 없어서 아무 일도 하지 않는다.
import type { IslandZoneId } from '@/constants/island-zones';

export type GameState = {
  /** 열린 구역 (서버/로컬 저장 기준) */
  zones: IslandZoneId[];
  /** 지금 솟아오르는 구역 (zoneUnlockReveal) */
  growing: IslandZoneId | null;
  /** 귤새 성장 단계 1~4 */
  level: number;
  /** RN useResponsive 의 factor. 크기를 RN과 같게 맞춘다 */
  factor: number;
  placed: { itemId: string; zoneId: IslandZoneId; sprite: string }[];
  lastPlaced: { itemId: string; zoneId: IslandZoneId } | null;
  placing: boolean;
  petOpen: boolean;
  /** 확대·이동을 막는다 (배치 중, 구역 열리는 중) */
  locked: boolean;
  /** 웰컴 등: 섬 위 귤새(알)를 숨긴다 */
  hideCreature?: boolean;
  /** 온보딩 스토리: 알 주변에 느낌표 강조 이펙트를 켠다 */
  noticeEgg?: boolean;
  explore: { level: number } | null;
  look: 1 | 2 | 3;
};

export type ToGame = ({ type: 'state' } & GameState) | { type: 'erupt' } | { type: 'camera-reset' };

export type FromGame =
  | { type: 'ready' }
  | { type: 'camera'; zoom: number; x: number; y: number; w: number; h: number }
  /** 화산재 진하기: 상단 바(top) · 토스트(mid) · 왼쪽 아래 버튼(bottom). block 이면 RN 터치를 막는다 */
  | { type: 'ash'; top: number; mid: number; bottom: number; block: boolean }
  | { type: 'tapCreature' }
  | { type: 'calm' }
  | { type: 'fog' }
  | { type: 'reveal' }
  | { type: 'done' }
  | { type: 'fps'; frames: number; dur: number; maxGap: number; long: number }
  | { type: 'log'; msg: string };

type RNWebView = { postMessage: (data: string) => void };
const rn = (window as unknown as { ReactNativeWebView?: RNWebView }).ReactNativeWebView;
const inFrame = window.parent !== window;

export const embedded = Boolean(rn) || inFrame;

export function send(msg: FromGame) {
  const data = JSON.stringify(msg);
  if (rn) rn.postMessage(data);
  else if (inFrame) window.parent.postMessage(data, '*');
}

export function listen(fn: (msg: ToGame) => void) {
  const handle = (raw: unknown) => {
    try {
      const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (msg && typeof msg.type === 'string') fn(msg as ToGame);
    } catch (err) {
      console.error(err);
    }
  };
  (window as unknown as { __fromRN?: (raw: unknown) => void }).__fromRN = handle;
  if (inFrame) {
    window.addEventListener('message', (event) => {
      if (event.source === window.parent) handle(event.data);
    });
  }
}
