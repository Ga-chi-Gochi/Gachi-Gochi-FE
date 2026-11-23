import * as Haptics from 'expo-haptics';
import { Image, type ImageSource } from 'expo-image';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GuideBackdrop,
  GuideChip,
  GuideFrame,
  GuideHeader,
  GuideSpeech,
  GuideStage,
  type GuideTone,
} from '@/components/guide/guide-controls';
import { GuidePager } from '@/components/guide/guide-pager';
import { GuideSpotlight } from '@/components/guide/guide-spotlight';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { GachiButton } from '@/components/gachi-ui/gachi-button';
import { GachiTextField } from '@/components/gachi-ui/gachi-text-field';
import { gachiUi } from '@/constants/gachi-ui';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useResponsive } from '@/hooks/use-responsive';
import { markOnboardingSeen, saveCreatureName } from '@/lib/onboarding-state';

const EGG = require('@/assets/pixel/gyulsae-egg.png');
const WALK = require('@/assets/pixel/icon-walk.png') as ImageSource;
const BONGGING = require('@/assets/pixel/icon-bongging.png') as ImageSource;
const LOCAL_SHOP = require('@/assets/pixel/icon-local-shop.png') as ImageSource;
const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

const NAME_CHIPS = ['귤돌이', '하르방', '봉봉이'] as const;
const RANDOM_NAMES = ['귤돌이', '하르방', '봉봉이', '새콤이', '감귤이', '돌하르'];
const TAP_GOAL = 3;
/** 알 이야기·두드리기 → 이름 → 키우기 안내. 저장/가입은 앞단 인증과 겹쳐서 두지 않는다 */
const PAGE_COUNT = 3;
const LAST_PAGE = PAGE_COUNT - 1;
/** 장마다 위쪽 글자 색. 어둡힘이 깔리는 장(성장)만 밝은 글자 */
const TONES: GuideTone[] = ['dark', 'dark', 'light'];

/** 섬 그림의 중심 높이(화면 높이 대비). 섬은 가로 가운데, 이 높이쯤에 놓인다 */
const ISLAND_CENTER_Y = 0.48;

type OnboardingFlowProps = {
  initialName?: string;
  onDone: (name: string | null) => void;
  /** 첫 장 스토리(말풍선)일 때 섬 알 강조 이펙트를 켠다 */
  onEggNotice?: (active: boolean) => void;
};

/** 장이 열릴 때 캐릭터가 톡 튀어나온다. 성장 연출(growth-reveal)과 같은 팝 */
function usePop(active: boolean, reduceMotion: boolean) {
  const [pop] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!active || reduceMotion) {
      pop.setValue(1);
      return;
    }
    pop.setValue(0.8);
    const animation = Animated.sequence([
      Animated.timing(pop, { toValue: 1.08, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(pop, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [active, reduceMotion, pop]);
  return pop;
}

const FADE_MS = 280;
const easeOut = Easing.out(Easing.cubic);

/** on 이면 1, 아니면 0 으로 부드럽게 바뀌는 값. 처음엔 상태에 맞춰 바로 시작한다 */
function useFade(on: boolean) {
  const reduceMotion = useReduceMotion();
  const [value] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      value.setValue(on ? 1 : 0);
      return;
    }
    Animated.timing(value, { toValue: on ? 1 : 0, duration: FADE_MS, easing: easeOut, useNativeDriver: true }).start();
  }, [on, reduceMotion, value]);
  return value;
}

/** 어둡힘(구멍 뚫린 덮개)이 장이 바뀔 때 슬라이드하지 않고 서서히 바뀌게 하는 고정 층 */
function DimLayer({ on, children }: { on: boolean; children: ReactNode }) {
  const opacity = useFade(on);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity }}>
      {children}
    </Animated.View>
  );
}

/**
 * 장이 열릴 때 안의 내용이 살짝 아래에서 떠오르며 나타난다(샤라락).
 * delay 로 순서를 주면 위에서부터 차례로 들어온다. 모션 줄이기를 켜면 바로 보인다.
 */
function Enter({
  active,
  delay = 0,
  distance = 14,
  style,
  children,
}: {
  active: boolean;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
  children: ReactNode;
}) {
  const { scale } = useResponsive();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    if (!active) {
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: FADE_MS, delay, easing: easeOut, useNativeDriver: true }).start();
  }, [active, delay, reduceMotion, progress]);
  return (
    <Animated.View
      style={[
        style,
        {
          // 옆으로 밀어서 넘기는 중에도 내용이 보이도록 완전히 투명하게는 두지 않는다
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [scale(distance), 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

export function OnboardingFlow({ initialName = '', onDone, onEggNotice }: OnboardingFlowProps) {
  const { width, height, scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [index, setIndex] = useState(0);
  const [taps, setTaps] = useState(0);
  const [name, setName] = useState(initialName);
  const [tilt, setTilt] = useState(0);
  /** 첫 장: 말풍선 스토리 → 알 두드리기 */
  const [eggPhase, setEggPhase] = useState<'story' | 'poke'>('story');
  const finishing = useRef(false);
  // 포커싱(어둡힘) 없이 섬을 그대로 보여 주므로 스토리도 어두운 글자
  const headerTone: GuideTone = TONES[index] ?? 'dark';
  const noticingEgg = index === 0 && eggPhase === 'story';

  useEffect(() => {
    onEggNotice?.(noticingEgg);
    return () => onEggNotice?.(false);
  }, [noticingEgg, onEggNotice]);

  const finish = (nextName: string | null) => {
    if (finishing.current) {
      return;
    }
    finishing.current = true;
    const trimmed = nextName?.trim() ?? '';
    void (async () => {
      if (trimmed) {
        await saveCreatureName(trimmed);
      }
      await markOnboardingSeen();
      onDone(trimmed || null);
    })();
  };

  const pokeEgg = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!reduceMotion) {
      setTilt(8);
      setTimeout(() => setTilt(-8), 70);
      setTimeout(() => setTilt(0), 150);
    }
    setTaps((current) => {
      const next = Math.min(TAP_GOAL, current + 1);
      // 3번 채우면 바로 이름 짓기 장으로 넘어간다
      if (next >= TAP_GOAL && current < TAP_GOAL) {
        setTimeout(() => setIndex(1), reduceMotion ? 0 : 220);
      }
      return next;
    });
  };

  const goName = () => {
    if (taps < TAP_GOAL) {
      pokeEgg();
      return;
    }
    setIndex(1);
  };

  const pickRandom = () => {
    const pool = RANDOM_NAMES.filter((entry) => entry !== name.trim());
    setName(pool[Math.floor(Math.random() * pool.length)] ?? '귤돌이');
  };

  const padTop = insets.top + scale(8);
  const padBottom = insets.bottom + scale(16);
  const contentTop = padTop + scale(44) + scale(8);

  return (
    <View accessibilityViewIsModal aria-modal style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 120 }}>
      {/* 어둡힘은 페이지와 함께 옆으로 밀리지 않고 제자리에서 서로 바뀐다. 앞뒤 장일 때만 그려 둔다 */}
      {Math.abs(index - 2) <= 1 ? (
        <DimLayer on={index === 2}>
          {/* 구멍 중심을 섬 중심에 맞춘다. 섬이 가로 폭의 약 81%로 가운데에 놓이므로 지름을 그 폭에 가깝게 잡는다 */}
          <GuideSpotlight
            width={width}
            height={height}
            centerX={width / 2}
            centerY={height * ISLAND_CENTER_Y}
            radius={Math.min(width * 0.42, height * 0.22)}
          />
        </DimLayer>
      ) : null}
      <GuidePager index={index} width={width} height={height} onIndexChange={setIndex}>
        <EggStep
          active={index === 0}
          phase={eggPhase}
          taps={taps}
          contentTop={contentTop}
          padBottom={padBottom}
          tilt={tilt}
          onPoke={pokeEgg}
          onStoryNext={() => setEggPhase('poke')}
          onNext={goName}
        />
        <NameStep
          active={index === 1}
          name={name}
          contentTop={contentTop}
          padBottom={padBottom}
          onChangeName={setName}
          onRandom={pickRandom}
          onNext={() => {
            if (!name.trim()) {
              return;
            }
            setIndex(2);
          }}
        />
        <GrowStep
          active={index === LAST_PAGE}
          contentTop={contentTop}
          padBottom={padBottom}
          title="이 알은 이렇게 키워요"
          body="가치를 실천해 경험치를 모으면, 알에서 깨어나고 섬도 넓어져요."
          rows={[
            { icon: WALK, title: '걸으면 경험치를 모아요' },
            { icon: BONGGING, title: '봉그깅하면 경험치를 모아요' },
            { icon: LOCAL_SHOP, title: '상점에서 귤코인으로 돌봐요' },
          ]}
          onNext={() => finish(name)}
        />
      </GuidePager>
      {/* 섬 위 장에서는 뒤의 HUD 가 비쳐 글자가 겹치므로 띠를 한 겹 더 깐다 */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          paddingTop: padTop,
          paddingBottom: scale(4),
        }}>
        <DimLayer on={headerTone === 'light'}>
          <View style={{ flex: 1, backgroundColor: gachiUi.dim }} />
        </DimLayer>
        <GuideHeader
          index={index}
          total={PAGE_COUNT}
          tone={headerTone}
          closeLabel="건너뛰기"
          onClose={() => finish(index === 0 ? null : name)}
        />
      </View>
    </View>
  );
}

function EggStep({
  active,
  phase,
  taps,
  contentTop,
  padBottom,
  tilt,
  onPoke,
  onStoryNext,
  onNext,
}: {
  active: boolean;
  phase: 'story' | 'poke';
  taps: number;
  contentTop: number;
  padBottom: number;
  tilt: number;
  onPoke: () => void;
  onStoryNext: () => void;
  onNext: () => void;
}) {
  const { width, height, scale } = useResponsive();
  const reduceMotion = useReduceMotion();
  const [bob] = useState(() => new Animated.Value(0));
  const ready = taps >= TAP_GOAL;
  const stage = Math.round(Math.min(width * 0.56, height * 0.3, scale(260)));
  const eggWidth = stage * 0.5;

  useEffect(() => {
    if (!active || phase !== 'poke' || reduceMotion) {
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, phase, reduceMotion, bob]);

  // 섬·파도 위에 말풍선으로 도착 이야기를 전한다 (알 이동 연출 대신)
  if (phase === 'story') {
    return (
      <View style={{ flex: 1 }}>
        <GuideFrame
          style={{
            flex: 1,
            paddingTop: contentTop + scale(8),
            paddingBottom: padBottom,
            paddingHorizontal: scale(28),
            justifyContent: 'space-between',
          }}>
          <Enter active={active} distance={18}>
            <GuideSpeech>
              <GalmuriText size={11} bold center>
                제주 바다에서 알이 왔어요.
              </GalmuriText>
              <GalmuriText size={9} color={gachiUi.inkSoft} center>
                파도에 떠밀려 이 섬에 도착한 신비한 알이에요.
              </GalmuriText>
            </GuideSpeech>
          </Enter>
          <Enter active={active} delay={160} distance={14} style={{ alignSelf: 'center' }}>
            <GachiButton label="알 만나기" width="wide" onPress={onStoryNext} />
          </Enter>
        </GuideFrame>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GuideBackdrop />
      <GuideFrame style={{ flex: 1, paddingTop: contentTop, paddingBottom: padBottom, paddingHorizontal: scale(24) }}>
        <GalmuriText size={14} bold center>
          {'알에게\n인사해 볼까요'}
        </GalmuriText>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(20) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="알에게 인사하기"
            accessibilityHint={`${TAP_GOAL}번 톡톡 두드리면 다음으로 넘어가요`}
            accessibilityValue={{ text: `${Math.min(taps, TAP_GOAL)}/${TAP_GOAL}` }}
            onPress={onPoke}>
            <GuideStage size={stage}>
              <Animated.View style={{ transform: [{ translateY: bob }, { rotate: `${tilt}deg` }] }}>
                <Image source={EGG} contentFit="contain" style={{ width: eggWidth, height: eggWidth * 1.25, ...pixelImageStyle }} />
              </Animated.View>
            </GuideStage>
          </Pressable>
          <GalmuriText size={9} color={gachiUi.inkSoft} center>
            {ready
              ? `알이 반가운가 봐요! (${TAP_GOAL}/${TAP_GOAL})`
              : `알을 ${TAP_GOAL}번 톡톡 두드려 보세요 (${taps}/${TAP_GOAL})`}
          </GalmuriText>
        </View>
        <View style={{ alignItems: 'center' }}>
          <GachiButton label="톡톡 인사하기" width="wide" onPress={onNext} />
        </View>
      </GuideFrame>
    </View>
  );
}

function NameStep({
  active,
  name,
  contentTop,
  padBottom,
  onChangeName,
  onRandom,
  onNext,
}: {
  active: boolean;
  name: string;
  contentTop: number;
  padBottom: number;
  onChangeName: (value: string) => void;
  onRandom: () => void;
  onNext: () => void;
}) {
  const { width, height, scale } = useResponsive();
  const reduceMotion = useReduceMotion();
  const pop = usePop(active, reduceMotion);
  const empty = !name.trim();
  const stage = Math.round(Math.min(width * 0.5, height * 0.22, scale(220)));
  const eggWidth = stage * 0.55;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <GuideBackdrop />
      <GuideFrame style={{ flex: 1, paddingTop: contentTop, paddingBottom: padBottom, paddingHorizontal: scale(24) }}>
        <GalmuriText size={14} bold center>
          {'이 알의 이름을\n지어 주세요'}
        </GalmuriText>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(20) }}>
          <GuideStage size={stage}>
            <Animated.View style={{ transform: [{ scale: pop }] }}>
              <Image source={EGG} contentFit="contain" style={{ width: eggWidth, height: eggWidth * 1.25, ...pixelImageStyle }} />
            </Animated.View>
          </GuideStage>
          <View style={{ alignSelf: 'stretch', gap: scale(12) }}>
            <GachiTextField
              accessibilityLabel="알 이름"
              value={name}
              onChangeText={onChangeName}
              placeholder="이름을 지어주세요"
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) }}>
              {NAME_CHIPS.map((chip) => (
                <GuideChip key={chip} label={chip} selected={name === chip} onPress={() => onChangeName(chip)} />
              ))}
              <GuideChip label="랜덤" selected={false} onPress={onRandom} />
            </View>
            {empty ? (
              <GalmuriText size={9} color={gachiUi.inkSoft} center>
                이름을 정하면 다음으로 갈 수 있어요
              </GalmuriText>
            ) : null}
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <GachiButton label="이 이름으로 할게요" width="wide" disabled={empty} onPress={onNext} />
        </View>
      </GuideFrame>
    </KeyboardAvoidingView>
  );
}

function GrowStep({
  active,
  contentTop,
  padBottom,
  title,
  body,
  rows,
  onNext,
}: {
  active: boolean;
  contentTop: number;
  padBottom: number;
  title: string;
  body: string;
  rows: { icon: ImageSource; title: string }[];
  onNext: () => void;
}) {
  const { scale } = useResponsive();
  return (
    <View style={{ flex: 1 }}>
      <GuideFrame
        style={{
          flex: 1,
          paddingTop: contentTop + scale(8),
          paddingBottom: padBottom,
          paddingHorizontal: scale(28),
          justifyContent: 'space-between',
        }}>
        <Enter active={active} distance={18}>
          <GuideSpeech compact>
            <GalmuriText size={11} bold center>
              {title}
            </GalmuriText>
            <GalmuriText size={9} color={gachiUi.inkSoft} center>
              {body}
            </GalmuriText>
            <View style={{ gap: scale(8) }}>
              {rows.map((row, order) => (
                <Enter key={row.title} active={active} delay={140 + order * 70} distance={10}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
                    <Image source={row.icon} contentFit="contain" style={{ width: scale(36), height: scale(36), ...pixelImageStyle }} />
                    <View style={{ flex: 1 }}>
                      <GalmuriText size={9}>{row.title}</GalmuriText>
                    </View>
                  </View>
                </Enter>
              ))}
            </View>
          </GuideSpeech>
        </Enter>
        <Enter active={active} delay={140 + rows.length * 70} distance={14} style={{ alignSelf: 'center' }}>
          <GachiButton label="시작하기" width="wide" onPress={onNext} />
        </Enter>
      </GuideFrame>
    </View>
  );
}
