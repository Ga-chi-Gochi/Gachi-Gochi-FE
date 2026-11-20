// 개발용 FPS 측정기.
// 화면 구석에 지금 FPS(UI·JS)를 띄우고, 앱을 쓰는 동안 1초마다 기록한다.
// 섬 확장·성장·탐험·배치·화면 이동은 자동으로 표시가 남고, "결과 복사"를 누르면 전체 기록이 글로 복사된다.
// - UI = 화면(네이티브) 스레드. Reanimated 애니메이션이 여기서 돈다.
// - JS = 리액트 스레드. setState·타이머로 움직이는 것과 터치 반응이 여기서 돈다.
// - 게임 = 섬 화면 웹뷰(Phaser) 안의 프레임. 섬이 열려 있을 때만 나온다.
// 기본은 꺼져 있다. 켜려면 .env 에 EXPO_PUBLIC_FPS_METER=1 을 넣고 앱을 다시 빌드(또는 expo start)한다.
import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayState } from '@/components/play-state';

export const FPS_METER_ENABLED = process.env.EXPO_PUBLIC_FPS_METER === '1';

/** 이 시간(ms)보다 오래 걸린 프레임을 "끊김"으로 센다. 33ms = 순간 30fps 아래 */
const LONG_FRAME_MS = 33;
/** 기록은 최대 30분까지 (넘으면 오래된 것부터 버린다) */
const MAX_SAMPLES = 1800;

type UiWindow = { seq: number; frames: number; dur: number; maxGap: number; long: number };
type Sample = {
  /** 기록 시작부터 이 샘플 끝까지 (초) */
  t: number;
  /** 이 샘플이 덮는 시간 (초) */
  dur: number;
  ui: number | null;
  uiGap: number;
  uiLong: number;
  js: number;
  jsGap: number;
  jsLong: number;
  game: number | null;
  gameGap: number;
  gameLong: number;
};
type Mark = { t: number; label: string };
type Corner = 'tr' | 'br' | 'bl' | 'tl';

const CORNERS: Corner[] = ['tr', 'br', 'bl', 'tl'];

const mmss = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const fpsColor = (v: number | null) => (v == null ? '#BBB' : v >= 50 ? '#5BE08F' : v >= 30 ? '#FFC93C' : '#FF6B6B');

/** 섬 게임(웹뷰)이 0.5초마다 보내는 프레임 묶음을 모아 둔다. 측정기가 1초마다 가져간다. */
const gameAcc = { frames: 0, dur: 0, maxGap: 0, long: 0 };

export function reportGameFrames(w: { frames: number; dur: number; maxGap: number; long: number }) {
  if (!FPS_METER_ENABLED) return;
  gameAcc.frames += w.frames;
  gameAcc.dur += w.dur;
  gameAcc.maxGap = Math.max(gameAcc.maxGap, w.maxGap);
  gameAcc.long += w.long;
}

export function FpsMeter() {
  if (!FPS_METER_ENABLED) return null;
  return <FpsMeterInner />;
}

function FpsMeterInner() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const play = usePlayState();

  // ---------------------------------------------------------------- UI 스레드 프레임
  // UI 스레드가 0.5초마다 한 묶음씩 큐에 넣고, JS는 1초마다 새 묶음만 가져간다 (서로 값을 지우지 않게 번호로 구분).
  const uiSeq = useSharedValue(0);
  const uiStart = useSharedValue(-1);
  const uiFrames = useSharedValue(0);
  const uiMaxGap = useSharedValue(0);
  const uiLong = useSharedValue(0);
  const uiMinDelta = useSharedValue(1000);
  const uiQueue = useSharedValue<UiWindow[]>([]);

  const uiLast = useSharedValue(-1);

  useFrameCallback((f) => {
    'worklet';
    if (uiStart.value < 0 || uiLast.value < 0) {
      uiStart.value = f.timestamp;
      uiLast.value = f.timestamp;
      return;
    }
    // 안드로이드에서 한 화면 프레임에 콜백이 두 번 오는 경우가 있다 (그대로 세면 120Hz 폰에서 227처럼 나온다).
    // 지난번에 센 프레임에서 5ms(=200Hz) 안에 온 호출은 같은 프레임으로 보고 세지 않는다.
    const d = f.timestamp - uiLast.value;
    if (d < 5) return;
    uiLast.value = f.timestamp;
    if (d < uiMinDelta.value) uiMinDelta.value = d;
    uiFrames.value += 1;
    if (d > uiMaxGap.value) uiMaxGap.value = d;
    if (d > LONG_FRAME_MS) uiLong.value += 1;
    const dur = f.timestamp - uiStart.value;
    if (dur >= 500) {
      const seq = uiSeq.value + 1;
      uiSeq.value = seq;
      const q = uiQueue.value;
      const next = q.length >= 40 ? q.slice(q.length - 39) : q.slice();
      next.push({ seq, frames: uiFrames.value, dur, maxGap: uiMaxGap.value, long: uiLong.value });
      uiQueue.value = next;
      uiStart.value = f.timestamp;
      uiFrames.value = 0;
      uiMaxGap.value = 0;
      uiLong.value = 0;
    }
  });

  // ---------------------------------------------------------------- JS 스레드 프레임
  const js = useRef({ frames: 0, maxGap: 0, long: 0, last: 0 });
  useEffect(() => {
    let id = 0;
    const loop = (ts: number) => {
      const a = js.current;
      if (a.last) {
        const d = ts - a.last;
        a.frames += 1;
        if (d > a.maxGap) a.maxGap = d;
        if (d > LONG_FRAME_MS) a.long += 1;
      }
      a.last = ts;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  // ---------------------------------------------------------------- 기록
  const startedAt = useRef(0); // 처음 그린 뒤 effect 에서 정한다
  const samples = useRef<Sample[]>([]);
  const marks = useRef<Mark[]>([{ t: 0, label: '기록 시작' }]);
  const dropped = useRef(0);
  const active = useRef(AppState.currentState === 'active');
  const lastTick = useRef(0);
  const lastSeq = useRef(0);
  const [view, setView] = useState<{ ui: number | null; js: number; game: number | null; elapsed: number }>({
    ui: null,
    js: 0,
    game: null,
    elapsed: 0,
  });
  const [open, setOpen] = useState(false);
  const [corner, setCorner] = useState<Corner>('tr');
  const [note, setNote] = useState('');
  const [markCount, setMarkCount] = useState(0);

  const addMark = useCallback((label: string) => {
    marks.current.push({ t: (Date.now() - startedAt.current) / 1000, label });
    setMarkCount(marks.current.length - 1);
  }, []);

  useEffect(() => {
    startedAt.current = Date.now();
    lastTick.current = startedAt.current;
    const id = setInterval(() => {
      const now = Date.now();
      const dur = (now - lastTick.current) / 1000;
      lastTick.current = now;

      // UI: 새로 들어온 묶음만 합친다
      let frames = 0;
      let uiDur = 0;
      let uiGap = 0;
      let uiLongN = 0;
      for (const w of uiQueue.value) {
        if (w.seq <= lastSeq.current) continue;
        lastSeq.current = w.seq;
        frames += w.frames;
        uiDur += w.dur;
        uiGap = Math.max(uiGap, w.maxGap);
        uiLongN += w.long;
      }
      const ui = uiDur > 0 ? (frames * 1000) / uiDur : null;

      const a = js.current;
      const jsFps = dur > 0 ? a.frames / dur : 0;
      const sample: Sample = {
        t: (now - startedAt.current) / 1000,
        dur,
        ui,
        uiGap: Math.round(uiGap),
        uiLong: uiLongN,
        js: jsFps,
        jsGap: Math.round(a.maxGap),
        jsLong: a.long,
        game: gameAcc.dur > 0 ? (gameAcc.frames * 1000) / gameAcc.dur : null,
        gameGap: Math.round(gameAcc.maxGap),
        gameLong: gameAcc.long,
      };
      gameAcc.frames = 0;
      gameAcc.dur = 0;
      gameAcc.maxGap = 0;
      gameAcc.long = 0;
      a.frames = 0;
      a.maxGap = 0;
      a.long = 0;

      if (active.current) {
        samples.current.push(sample);
        if (samples.current.length > MAX_SAMPLES) {
          samples.current.shift();
          dropped.current += 1;
        }
      }
      setView((v) => ({ ui: ui ?? v.ui, js: jsFps, game: sample.game, elapsed: sample.t }));
    }, 1000);
    return () => clearInterval(id);
  }, [uiQueue]);

  // 앱이 뒤로 갔을 때는 기록하지 않는다 (돌아온 첫 프레임 간격도 버린다)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      const isActive = s === 'active';
      if (isActive === active.current) return;
      active.current = isActive;
      js.current.last = 0;
      uiLast.value = -1; // 돌아온 첫 프레임 간격은 끊김으로 세지 않는다
      addMark(isActive ? '앱으로 돌아옴' : '앱 나감 (기록 멈춤)');
    });
    return () => sub.remove();
  }, [addMark, uiLast]);

  // ---------------------------------------------------------------- 자동 표시
  useChangeMark(pathname, (p) => `화면 ${p}`, addMark);
  useChangeMark(
    play.zoneUnlockReveal,
    (r, prev) =>
      r ? `섬 확장 연출 시작: ${r.zoneName}${r.volcanoBurst ? ' (화산)' : ''}` : prev ? '섬 확장 연출 끝' : null,
    addMark,
  );
  useChangeMark(play.islandStage, (s) => `섬 단계 ${s}/${play.islandStageMax}`, addMark);
  useChangeMark(
    play.growthReveal,
    (g, prev) => (g ? `성장 연출 시작: ${g.from.label}→${g.to.label}` : prev ? '성장 연출 끝' : null),
    addMark,
  );
  useChangeMark(play.exploreEggReveal, (e, prev) => (e ? '탐험 알 연출 시작' : prev ? '탐험 알 연출 끝' : null), addMark);
  useChangeMark(play.isExploring, (x) => (x ? '탐험 시작' : '탐험 끝'), addMark);
  useChangeMark(
    play.pendingPlaceItemId,
    (id, prev) => (id ? `배치 모드: ${id}` : prev ? '배치 모드 끝' : null),
    addMark,
  );
  useChangeMark(play.lastPlaced, (l) => (l ? `장식 놓음: ${l.itemId} → ${l.zoneId}` : null), addMark);

  // ---------------------------------------------------------------- 버튼
  const copy = async () => {
    const text = buildReport({
      samples: samples.current,
      marks: marks.current,
      dropped: dropped.current,
      startedAt: startedAt.current,
      refreshHz: uiMinDelta.value < 1000 ? Math.round(1000 / uiMinDelta.value) : null,
    });
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
      await Clipboard.setStringAsync(text);
      setNote(`복사됨 ✓ ${samples.current.length}초 · 표시 ${marks.current.length}개`);
    } catch {
      // 클립보드 모듈이 없는 옛 빌드면 공유 창으로 보낸다 (공유 창의 "복사"를 누르면 된다)
      await Share.share({ message: text });
      setNote('공유 창으로 보냈어요');
    }
  };

  const restart = () => {
    startedAt.current = Date.now();
    samples.current = [];
    marks.current = [{ t: 0, label: '기록 새로 시작' }];
    dropped.current = 0;
    setMarkCount(0);
    setNote('기록을 새로 시작했어요');
  };

  const pos = {
    tr: { top: insets.top + 4, right: 6, alignItems: 'flex-end' as const },
    br: { bottom: insets.bottom + 6, right: 6, alignItems: 'flex-end' as const },
    bl: { bottom: insets.bottom + 6, left: 6, alignItems: 'flex-start' as const },
    tl: { top: insets.top + 4, left: 6, alignItems: 'flex-start' as const },
  }[corner];
  const bottom = corner === 'br' || corner === 'bl';

  const panel = open ? (
    <View style={styles.panel}>
      <Text style={styles.panelText}>
        기록 {mmss(view.elapsed)} · 표시 {markCount}개 (자동+직접)
      </Text>
      <View style={styles.row}>
        <Btn label="📍 표시 남기기" onPress={() => addMark(`직접 표시 ${marks.current.filter((m) => m.label.startsWith('직접')).length + 1}`)} />
        <Btn label="📋 결과 복사" hot onPress={copy} />
      </View>
      <View style={styles.row}>
        <Btn label="새로 시작" onPress={restart} />
        <Btn label="자리 옮기기" onPress={() => setCorner((c) => CORNERS[(CORNERS.indexOf(c) + 1) % 4])} />
        <Btn label="접기" onPress={() => setOpen(false)} />
      </View>
      {!!note && <Text style={styles.note}>{note}</Text>}
    </View>
  ) : null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, pos]}>
      {bottom && panel}
      <Pressable
        onPress={() => {
          setOpen((o) => !o);
          setNote('');
        }}
        onLongPress={() => setCorner((c) => CORNERS[(CORNERS.indexOf(c) + 1) % 4])}
        style={styles.pill}
        hitSlop={6}
      >
        <View style={styles.rec} />
        <Text style={styles.pillText}>
          UI <Text style={{ color: fpsColor(view.ui) }}>{view.ui == null ? '-' : Math.round(view.ui)}</Text>
          {'  '}JS <Text style={{ color: fpsColor(view.js) }}>{Math.round(view.js)}</Text>
          {view.game != null ? (
            <>
              {'  '}게임 <Text style={{ color: fpsColor(view.game) }}>{Math.round(view.game)}</Text>
            </>
          ) : null}
        </Text>
      </Pressable>
      {!bottom && panel}
    </View>
  );
}

function Btn({ label, onPress, hot }: { label: string; onPress: () => void; hot?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, hot && styles.btnHot]}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

/** 값이 바뀔 때마다 표시를 남긴다 (처음 값은 남기지 않는다) */
function useChangeMark<T>(value: T, label: (v: T, prev: T) => string | null, addMark: (s: string) => void) {
  const prev = useRef(value);
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    const old = prev.current;
    prev.current = value;
    const s = label(value, old);
    if (s) addMark(s);
    // label 은 매번 새 함수라 일부러 뺀다
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---------------------------------------------------------------- 결과 글
type Stats = {
  dur: number;
  uiAvg: number | null;
  uiMin: number | null;
  uiGap: number;
  uiLong: number;
  jsAvg: number;
  jsMin: number;
  jsGap: number;
  jsLong: number;
  gameAvg: number | null;
  gameMin: number | null;
  gameGap: number;
  gameLong: number;
};

function stats(list: Sample[]): Stats | null {
  if (!list.length) return null;
  let dur = 0;
  let uiW = 0;
  let uiSum = 0;
  let uiMin: number | null = null;
  let jsSum = 0;
  let jsMin = Infinity;
  let gameW = 0;
  let gameSum = 0;
  let gameMin: number | null = null;
  const s = { uiGap: 0, uiLong: 0, jsGap: 0, jsLong: 0, gameGap: 0, gameLong: 0 };
  for (const x of list) {
    dur += x.dur;
    if (x.ui != null) {
      uiSum += x.ui * x.dur;
      uiW += x.dur;
      uiMin = uiMin == null ? x.ui : Math.min(uiMin, x.ui);
    }
    if (x.game != null) {
      gameSum += x.game * x.dur;
      gameW += x.dur;
      gameMin = gameMin == null ? x.game : Math.min(gameMin, x.game);
      s.gameGap = Math.max(s.gameGap, x.gameGap);
      s.gameLong += x.gameLong;
    }
    jsSum += x.js * x.dur;
    jsMin = Math.min(jsMin, x.js);
    s.uiGap = Math.max(s.uiGap, x.uiGap);
    s.jsGap = Math.max(s.jsGap, x.jsGap);
    s.uiLong += x.uiLong;
    s.jsLong += x.jsLong;
  }
  return {
    dur,
    uiAvg: uiW ? uiSum / uiW : null,
    uiMin,
    jsAvg: dur ? jsSum / dur : 0,
    jsMin,
    gameAvg: gameW ? gameSum / gameW : null,
    gameMin,
    ...s,
  };
}

const r0 = (n: number | null) => (n == null ? '-' : String(Math.round(n)));

function statLine(s: Stats) {
  return (
    `UI 평균 ${r0(s.uiAvg)} · 최저 ${r0(s.uiMin)} · 끊김 ${s.uiLong}번(최대 ${s.uiGap}ms) | ` +
    `JS 평균 ${r0(s.jsAvg)} · 최저 ${r0(s.jsMin)} · 끊김 ${s.jsLong}번(최대 ${s.jsGap}ms)` +
    (s.gameAvg != null
      ? ` | 게임 평균 ${r0(s.gameAvg)} · 최저 ${r0(s.gameMin)} · 끊김 ${s.gameLong}번(최대 ${s.gameGap}ms)`
      : '')
  );
}

function buildReport({
  samples,
  marks,
  dropped,
  startedAt,
  refreshHz,
}: {
  samples: Sample[];
  marks: Mark[];
  dropped: number;
  startedAt: number;
  refreshHz: number | null;
}) {
  const c = (Platform.constants ?? {}) as Record<string, unknown>;
  const device =
    Platform.OS === 'android'
      ? `${c.Brand ?? ''} ${c.Model ?? ''} · Android ${c.Release ?? Platform.Version}`
      : `iOS ${Platform.Version}`;
  const start = new Date(startedAt);
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')} ${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  const total = stats(samples);
  const end = samples.length ? samples[samples.length - 1].t : 0;

  const lines: string[] = [
    '가치고치 팀 앱 FPS 기록 (섬 = Phaser 웹뷰판)',
    `기기: ${device.trim()} · 화면 최대 약 ${refreshHz ?? '-'}Hz`,
    `시작 ${startStr} · 기록 ${mmss(end)} (${samples.length}초)${dropped ? ` · 앞부분 ${dropped}초는 30분 넘어서 버림` : ''}`,
    `읽는 법: UI=화면 스레드(Reanimated 애니메이션), JS=리액트 스레드(setState·터치 반응), 게임=섬 웹뷰(Phaser) 프레임. 끊김=${LONG_FRAME_MS}ms 넘은 프레임 수. 최저=1초 단위 최저.`,
    '',
    `[전체] ${total ? statLine(total) : '기록 없음'}`,
    '',
    '[구간별] 표시가 남은 때부터 다음 표시까지',
  ];

  // 구간: 표시 사이. 샘플은 가운데 시각이 들어가는 구간에 넣는다.
  const sorted = [...marks].sort((a, b) => a.t - b.t);
  for (let i = 0; i < sorted.length; i++) {
    const from = sorted[i].t;
    const to = i + 1 < sorted.length ? sorted[i + 1].t : Infinity;
    const inSeg = samples.filter((x) => {
      const mid = x.t - x.dur / 2;
      return mid >= from && mid < to;
    });
    const s = stats(inSeg);
    const toStr = to === Infinity ? mmss(end) : mmss(to);
    lines.push(`${mmss(from)}~${toStr} ${sorted[i].label} | ${s ? statLine(s) : '(1초 미만)'}`);
  }

  lines.push('', '[1초 기록] 시간 UI fps(최대 프레임 ms) · JS fps(최대 프레임 ms) · 게임 fps(최대 프레임 ms) ◀ 그 사이 표시');
  let mi = 0;
  for (const x of samples) {
    const here: string[] = [];
    while (mi < sorted.length && sorted[mi].t <= x.t) {
      here.push(sorted[mi].label);
      mi += 1;
    }
    lines.push(
      `${mmss(x.t)} UI ${r0(x.ui)}(${x.uiGap}) · JS ${r0(x.js)}(${x.jsGap})` +
        (x.game != null ? ` · 게임 ${r0(x.game)}(${x.gameGap})` : '') +
        (here.length ? ` ◀ ${here.join(', ')}` : ''),
    );
  }
  return lines.join('\n');
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 9999, elevation: 9999, gap: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(20, 18, 24, 0.72)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rec: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF5A5A' },
  pillText: { color: '#FFF', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  panel: {
    width: 236,
    backgroundColor: 'rgba(20, 18, 24, 0.88)',
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  panelText: { color: '#DDD', fontSize: 11 },
  note: { color: '#5BE08F', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 5 },
  btn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  btnHot: { backgroundColor: '#F2711C' },
  btnText: { color: '#FFF', fontSize: 11.5, fontWeight: '800' },
});
