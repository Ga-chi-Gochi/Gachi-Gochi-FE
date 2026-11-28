// 섬 화면(바다·땅·화산·용암·화산재·귤새·장식·탐험 미니 연출·핀치 확대)은 Phaser 게임이 그린다.
// 게임 코드는 game/, 빌드 결과는 assets/game/island.html (npm run game:build).
// 폰에서는 웹뷰, 웹에서는 iframe 으로 띄우고, 상태는 메시지로 주고받는다. 버튼·시트·토스트는 RN 그대로다.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type Ref } from 'react';
import { Platform, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import { reportGameFrames } from '@/components/dev/fps-meter';
import { useVolcanoEruption } from '@/components/island/volcano-eruption';
import { usePlayState } from '@/components/play-state';
import { getShopItem } from '@/constants/content';
import { exploreForestCharacter, exploreGochiLevel } from '@/constants/explore';
import type { IslandZoneId } from '@/constants/island-zones';
import { wearLayers } from '@/constants/wear-slots';
import { useResponsive } from '@/hooks/use-responsive';

const GAME_HTML = require('@/assets/game/island.html');

/** game:build 후 웹뷰가 옛 HTML 을 붙들지 않게 올린다 */
const ISLAND_GAME_BUILD = 'forest-explore-21';

/** 바다 기본 색. 게임이 뜨기 전에도 같은 색이 보이게 한다. */
export const ISLAND_SEA = '#2ca6a4';

/** 게임 카메라와 게임 화면 크기(dp). 섬 좌표 → 화면 좌표 = w/2 + (섬 - w/2) × zoom + x */
export type IslandZoneBox = { left: number; top: number; width: number; height: number };
export type IslandCameraState = {
  zoom: number;
  x: number;
  y: number;
  w: number;
  h: number;
  zones?: Partial<Record<IslandZoneId, IslandZoneBox>>;
};
/** 화산재가 상단 바(top) · 토스트(mid) · 왼쪽 아래 버튼(bottom) 자리를 덮은 정도(0~1) */
export type IslandAsh = { top: number; mid: number; bottom: number; block: boolean };
export const NO_ASH: IslandAsh = { top: 0, mid: 0, bottom: 0, block: false };

type GameSource = { html?: string; uri: string };

/** react-native-webview 14 의 타입 선언은 기본 제네릭(undefined) 때문에 props 가 never 가 된다. 실제 컴포넌트는 같다. */
type WebViewHandle = { injectJavaScript: (script: string) => void };
const GameWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

let cachedHtml: { build: string; html: string } | null = null;

async function readHtml(uri: string): Promise<string> {
  try {
    return await new File(uri).text();
  } catch {
    // Expo Go 등에서 새 File API 가 실패하면 legacy 로 읽는다
    try {
      return await readAsStringAsync(uri);
    } catch {
      const res = await fetch(uri);
      return await res.text();
    }
  }
}

async function loadGame(): Promise<GameSource> {
  const asset = Asset.fromModule(GAME_HTML);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (Platform.OS === 'web') {
    const join = uri.includes('?') ? '&' : '?';
    return { uri: `${uri}${join}v=${ISLAND_GAME_BUILD}` };
  }
  // 네이티브(Expo Go 포함): 단일 HTML 을 문자열로 주입한다 (file:// URI 는 Android 권한 이슈가 잦다)
  if (!cachedHtml || cachedHtml.build !== ISLAND_GAME_BUILD) {
    const html = await readHtml(uri);
    if (!html || html.length < 1000 || !html.includes('<script')) {
      throw new Error(`island.html 로드 실패 (${html?.length ?? 0} bytes)`);
    }
    cachedHtml = { build: ISLAND_GAME_BUILD, html };
  }
  return { html: cachedHtml.html, uri };
}

type GameMessage =
  | { type: 'ready' }
  | ({ type: 'camera' } & IslandCameraState)
  | ({ type: 'ash' } & IslandAsh)
  | { type: 'tapCreature' }
  | { type: 'calm' }
  | { type: 'fog' }
  | { type: 'reveal' }
  | { type: 'done' }
  | { type: 'fps'; frames: number; dur: number; maxGap: number; long: number }
  | { type: 'explore-entered' };

type IslandGameProps = {
  /** preview: 웰컴용. 파도만 보이고 탭·핀치·화산 입력은 막는다 */
  mode?: 'play' | 'preview';
  petOpen: boolean;
  /** 온보딩 스토리: 알 주변에 픽셀 느낌표 강조 */
  noticeEgg?: boolean;
  onTapCreature: () => void;
  onCamera: (camera: IslandCameraState) => void;
  onAsh: (ash: IslandAsh) => void;
};

export function IslandGame({
  mode = 'play',
  petOpen,
  noticeEgg = false,
  onTapCreature,
  onCamera,
  onAsh,
}: IslandGameProps) {
  const play = usePlayState();
  const { token, phase, calm, openFog, finish } = useVolcanoEruption();
  const { factor } = useResponsive();
  const preview = mode === 'preview';
  const [source, setSource] = useState<GameSource | null>(null);
  const [webKey, setWebKey] = useState(0);
  const webRef = useRef<WebViewHandle>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const stateRef = useRef('');
  /** 게임이 뜨기 전에 누른 "섬 넓히기". 뜨자마자 보낸다 */
  const pendingEruptRef = useRef(false);
  const handlersRef = useRef({
    onTapCreature,
    onCamera,
    onAsh,
    calm,
    openFog,
    finish,
    phase,
    reveal: play.revealExpandedZone,
    releaseExpand: play.releaseIslandExpandAttempt,
    markExploreEntered: play.markExploreEntered,
  });

  useEffect(() => {
    handlersRef.current = {
      onTapCreature,
      onCamera,
      onAsh,
      calm,
      openFog,
      finish,
      phase,
      reveal: play.revealExpandedZone,
      releaseExpand: play.releaseIslandExpandAttempt,
      markExploreEntered: play.markExploreEntered,
    };
  }, [
    calm,
    finish,
    onAsh,
    onCamera,
    onTapCreature,
    openFog,
    phase,
    play.markExploreEntered,
    play.releaseIslandExpandAttempt,
    play.revealExpandedZone,
  ]);

  useEffect(() => {
    let alive = true;
    void loadGame()
      .then((next) => {
        if (alive) setSource(next);
      })
      .catch((err) => {
        console.error('[IslandGame] load failed', err);
        // 캐시가 깨졌으면 다음 시도에서 다시 읽게 한다
        cachedHtml = null;
      });
    return () => {
      alive = false;
    };
  }, []);

  const post = useCallback((data: string) => {
    if (Platform.OS === 'web') {
      frameRef.current?.contentWindow?.postMessage(data, '*');
      return;
    }
    webRef.current?.injectJavaScript(`window.__fromRN && window.__fromRN(${JSON.stringify(data)}); true;`);
  }, []);

  const placed = play.placed;
  const stateJson = useMemo(
    () =>
      JSON.stringify({
        type: 'state',
        zones: play.unlockedZones,
        growing: play.zoneUnlockReveal?.zoneId ?? null,
        level: play.growthReveal ? play.growthReveal.from.level : play.growthStage.level,
        factor,
        placed: placed
          .map((entry) => ({ itemId: entry.itemId, zoneId: entry.zoneId, sprite: getShopItem(entry.itemId)?.sprite ?? '' }))
          .filter((entry) => entry.sprite),
        lastPlaced: play.lastPlaced,
        placing: Boolean(play.pendingPlaceItemId),
        petOpen: preview ? false : petOpen,
        // preview 는 게임 쪽 locked 로 핀치·탭을 막고, RN 은 pointerEvents none 으로 한 번 더 막는다
        locked: preview || Boolean(play.zoneUnlockReveal || play.pendingPlaceItemId),
        // 웰컴(preview)·모험 중에는 섬 고치를 숨긴다 (끝나면 다시 표시)
        hideCreature: preview || play.isExploring,
        noticeEgg: !preview && noticeEgg,
        // 탐험 중에만 선택한 고치 애니. 끝나면 null → 게임에서 즉시 숨김
        explore:
          !preview && play.exploreForestUnlocked && play.isExploring
            ? {
                level: exploreGochiLevel(play.exploringGochiId),
                character: exploreForestCharacter(play.exploringGochiId),
              }
            : null,
        wear: { ...wearLayers(play.equipped), face: play.equipped.face, seat: play.equipped.seat },
      }),
    [
      factor,
      noticeEgg,
      petOpen,
      placed,
      play.exploreForestUnlocked,
      play.exploringGochiId,
      play.growthReveal,
      play.growthStage.level,
      play.isExploring,
      play.equipped,
      play.lastPlaced,
      play.pendingPlaceItemId,
      play.unlockedZones,
      play.zoneUnlockReveal,
      preview,
    ],
  );

  useEffect(() => {
    stateRef.current = stateJson;
    if (readyRef.current) post(stateJson);
  }, [post, stateJson]);

  // "섬 넓히기" → 분화 시작 (VolcanoEruptionProvider 의 token 이 오른다)
  useEffect(() => {
    if (preview || token <= 0) return;
    if (readyRef.current) post(JSON.stringify({ type: 'erupt' }));
    else pendingEruptRef.current = true;
  }, [post, preview, token]);

  const onGameMessage = useCallback(
    (raw: unknown) => {
      let msg: GameMessage;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : (raw as GameMessage);
      } catch {
        return;
      }
      const h = handlersRef.current;
      switch (msg?.type) {
        case 'ready':
          readyRef.current = true;
          if (stateRef.current) post(stateRef.current);
          if (preview) {
            post(JSON.stringify({ type: 'camera-reset' }));
          } else if (pendingEruptRef.current) {
            pendingEruptRef.current = false;
            post(JSON.stringify({ type: 'erupt' }));
          } else if (h.phase !== 'idle') {
            // 분화 도중 웹뷰가 다시 떴다: 연출은 사라졌으니 상태만 정리한다 (안 하면 다시는 못 넓힌다)
            h.onAsh(NO_ASH);
            h.finish();
          }
          break;
        case 'camera':
          h.onCamera({ zoom: msg.zoom, x: msg.x, y: msg.y, w: msg.w, h: msg.h, zones: msg.zones });
          break;
        case 'ash':
          h.onAsh({ top: msg.top, mid: msg.mid, bottom: msg.bottom, block: msg.block });
          break;
        case 'tapCreature':
          h.onTapCreature();
          break;
        case 'calm':
          h.calm();
          break;
        case 'fog':
          h.openFog();
          break;
        case 'reveal':
          h.reveal();
          break;
        case 'done':
          h.finish();
          // 연출이 끝나면 busy 를 풀어, 다음 XP 확장도 같은 경로로 돌 수 있게 한다
          h.releaseExpand();
          break;
        case 'fps':
          reportGameFrames(msg);
          break;
        case 'explore-entered':
          void h.markExploreEntered();
          break;
        default:
          break;
      }
    },
    [post, preview],
  );

  // 웹: iframe 이 보낸 메시지만 받는다
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onMessage = (event: MessageEvent) => {
      if (frameRef.current && event.source === frameRef.current.contentWindow) onGameMessage(event.data);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onGameMessage]);

  // 웹뷰가 죽으면(메모리 부족 등) 다시 띄운다
  const restart = useCallback(() => {
    readyRef.current = false;
    setWebKey((key) => key + 1);
  }, []);

  let body = null;
  if (source && Platform.OS === 'web') {
    body = (
      <iframe
        ref={frameRef}
        src={source.uri}
        title="섬"
        style={{ border: 0, width: '100%', height: '100%', display: 'block', background: ISLAND_SEA }}
      />
    );
  } else if (source?.html) {
    body = (
      <GameWebView
        key={webKey}
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: source.html, baseUrl: 'https://island.gachigochi.local/' }}
        onMessage={(event: WebViewMessageEvent) => onGameMessage(event.nativeEvent.data)}
        onError={(e) => console.error('[IslandGame] webview error', e.nativeEvent)}
        onHttpError={(e) => console.error('[IslandGame] webview http', e.nativeEvent)}
        onRenderProcessGone={restart}
        onContentProcessDidTerminate={restart}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        textZoom={100}
        androidLayerType="hardware"
        webviewDebuggingEnabled={__DEV__}
        style={{ flex: 1, backgroundColor: ISLAND_SEA }}
        containerStyle={{ backgroundColor: ISLAND_SEA }}
      />
    );
  }

  return (
    <View
      pointerEvents={preview ? 'none' : 'auto'}
      style={{ flex: 1, backgroundColor: ISLAND_SEA }}>
      {body}
    </View>
  );
}
