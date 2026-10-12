import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { FigButton } from '@/components/fig-button';
import { FigScreen } from '@/components/fig-screen';
import { TopBar } from '@/components/top-bar';
import { WalkingConsentFlow } from '@/components/walking-consent-flow';
import { WALKING_INTRO_MESSAGES, WalkingIntroPopup, WalkingRewardPopup } from '@/components/walking-popup';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { WALKING_REWARD_LABELS, WALKING_REWARD_TIERS } from '@/constants/walking-reward';
import { useHealthAccess } from '@/hooks/use-health-access';
import { useResponsive } from '@/hooks/use-responsive';
import { useTodaySteps } from '@/hooks/use-today-steps';
import { useWalkingReward } from '@/hooks/use-walking-reward';
import { hasSeenWalkingIntro, markWalkingIntroSeen, nextWalkingTier } from '@/lib/walking-reward';

// 걷기 화면. 먼저 '건강 앱 접근 허용' 여부를 확인하고,
// 허용했거나 개인정보 수집에 동의한 경우에만 걸음을 불러온다. 거부했으면 동의 흐름을 보여 준다.
export default function WalkingScreen() {
  const { scale } = useResponsive();
  const { status, permission, consented, agree, setMockPermission, resetConsent } = useHealthAccess();

  const devTools = __DEV__ ? (
    <View style={{ gap: scale(8) }}>
      <Text style={{ color: palette.muted, fontSize: scale(12), fontWeight: '700' }}>
        개발용 · 권한: {permission === 'granted' ? '허용' : '거부'} · 동의: {consented ? '저장됨' : '없음'}
      </Text>
      <View style={{ flexDirection: 'row', gap: scale(10) }}>
        <FigButton label="권한 허용으로 테스트" tone="white" onPress={() => setMockPermission('granted')} />
        <FigButton label="권한 거부로 테스트" tone="white" onPress={() => setMockPermission('denied')} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <FigButton label="동의 기록 초기화" tone="white" onPress={() => void resetConsent().catch(() => undefined)} />
      </View>
    </View>
  ) : null;

  return (
    <FigScreen colors={[palette.cream, palette.cream]}>
      {status === 'checking' ? (
        <TopBar title="걷기" />
      ) : status === 'ready' ? (
        <WalkingContent devTools={devTools} />
      ) : (
        <WalkingConsentFlow onAgree={() => void agree().catch(() => undefined)} onLeave={() => router.replace('/home')} devTools={devTools} />
      )}
    </FigScreen>
  );
}

// 권한·동의 확인이 끝난 뒤에 보이는 걷기 본문. 이 컴포넌트가 나타날 때 걸음을 불러온다.
function WalkingContent({ devTools }: { devTools: ReactNode }) {
  const { scale } = useResponsive();
  const { steps, distanceMeters, addMockSteps, resetMockSteps } = useTodaySteps();
  const { claimedSteps, drops, reward, dismissReward, resetTodayClaims } = useWalkingReward(steps);
  const [introStep, setIntroStep] = useState<number | null>(null);
  const [introChecked, setIntroChecked] = useState(false);

  useEffect(() => {
    hasSeenWalkingIntro()
      .then((seen) => {
        if (!seen) {
          setIntroStep(0);
        }
      })
      .catch(() => undefined)
      .finally(() => setIntroChecked(true));
  }, []);

  const nextIntro = useCallback(() => {
    if (introStep == null) {
      return;
    }
    if (introStep < WALKING_INTRO_MESSAGES.length - 1) {
      setIntroStep(introStep + 1);
      return;
    }
    setIntroStep(null);
    void markWalkingIntroSeen().catch(() => undefined);
  }, [introStep]);

  const resetToday = useCallback(() => {
    void resetTodayClaims()
      .then(resetMockSteps)
      .catch(() => undefined);
  }, [resetMockSteps, resetTodayClaims]);

  const nextTier = nextWalkingTier(steps);
  const progress = nextTier ? Math.min(1, steps / nextTier.steps) : 1;

  return (
    <>
      <TopBar title="걷기" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: scale(24), paddingBottom: scale(16), gap: scale(14) }}>
        <View style={{ backgroundColor: palette.white, borderRadius: scale(24), padding: scale(18), gap: scale(12) }}>
          <Text style={{ color: palette.muted, fontSize: scale(14), fontWeight: '700' }}>오늘의 걷기 가치</Text>
          <Text style={{ fontSize: scale(36), fontWeight: '800', color: palette.sea }}>
            {formatNumber(steps)} <Text style={{ fontSize: scale(18), color: palette.ink }}>보 걸었어요</Text>
          </Text>
          <View style={{ backgroundColor: palette.mist, borderRadius: scale(16), padding: scale(12) }}>
            <Text style={{ fontSize: scale(18), fontWeight: '800', color: palette.ink }}>{formatNumber(distanceMeters)} m</Text>
            <Text style={{ color: palette.muted, fontSize: scale(12), marginTop: scale(4) }}>오늘 걸은 거리</Text>
          </View>
          <View style={{ gap: scale(6) }}>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
              style={{ height: scale(12), borderRadius: scale(6), backgroundColor: palette.mist, overflow: 'hidden' }}>
              <View style={{ width: `${progress * 100}%`, height: '100%', borderRadius: scale(6), backgroundColor: palette.leaf }} />
            </View>
            <Text style={{ color: palette.body, fontSize: scale(12), fontWeight: '700' }}>
              {nextTier ? `다음 보상(${formatNumber(nextTier.steps)}보)까지 ${formatNumber(nextTier.steps - steps)}보 남았어요` : '오늘 받을 수 있는 보상을 모두 받았어요'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: scale(8) }}>
            {WALKING_REWARD_TIERS.map((tier) => {
              const claimed = claimedSteps.includes(tier.steps);
              return (
                <View
                  key={tier.steps}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(4), backgroundColor: claimed ? palette.leafSoft : palette.mist, borderRadius: scale(999), paddingVertical: scale(6) }}>
                  {claimed ? <MaterialIcons name="check" size={scale(14)} color={palette.leafDeep} /> : null}
                  <Text style={{ color: claimed ? palette.leafDeep : palette.muted, fontSize: scale(12), fontWeight: '800' }}>{formatNumber(tier.steps)}보</Text>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: scale(8) }}>
          <DropPill label={WALKING_REWARD_LABELS.oxygen} value={drops.oxygen} backgroundColor={palette.leafSoft} />
          <DropPill label={WALKING_REWARD_LABELS.water} value={drops.water} backgroundColor={palette.seaSoft} />
        </View>
        {/* [TODO: 성장 연결] 모은 방울로 캐릭터·섬이 자라는 모습을 보여 줄 자리. 지금은 기존 그림만 둔다. */}
        <View style={{ backgroundColor: palette.white, borderRadius: scale(24), padding: scale(16), alignItems: 'center', gap: scale(8) }}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: palette.ink, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(4) }}>
            <Text style={{ color: palette.white, fontSize: scale(12), fontWeight: '700' }}>반짝이는 가치 방울</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: scale(4) }}>
            <Image source={art.smile} style={{ width: scale(92), height: scale(100) }} contentFit="contain" />
            <Image source={art.dropJump} style={{ width: scale(74), height: scale(106) }} contentFit="contain" />
            <Image source={art.wink} style={{ width: scale(82), height: scale(93) }} contentFit="contain" />
          </View>
          <Text style={{ color: palette.body, fontSize: scale(12) }}>모인 방울이 띠롱이를 자라게 해요</Text>
        </View>
        {__DEV__ ? (
          <View style={{ gap: scale(8) }}>
            <Text style={{ color: palette.muted, fontSize: scale(12), fontWeight: '700' }}>개발용 (배포 빌드에서는 보이지 않아요)</Text>
            <View style={{ flexDirection: 'row', gap: scale(10) }}>
              <FigButton label="+500보" tone="white" onPress={addMockSteps} />
              <FigButton label="오늘 기록 초기화" tone="white" onPress={resetToday} />
            </View>
          </View>
        ) : null}
        {devTools}
      </ScrollView>
      <View style={{ flexDirection: 'row', paddingHorizontal: scale(24), marginBottom: scale(8) }}>
        <FigButton label="섬으로 돌아가기" onPress={() => router.replace('/home')} />
      </View>
      {introStep != null ? (
        <WalkingIntroPopup step={introStep} onNext={nextIntro} />
      ) : introChecked && reward ? (
        <WalkingRewardPopup distanceMeters={distanceMeters} reward={reward} onClose={dismissReward} />
      ) : null}
    </>
  );
}

function DropPill({ label, value, backgroundColor }: { label: string; value: number; backgroundColor: string }) {
  const { scale } = useResponsive();

  return (
    <View style={{ flex: 1, backgroundColor, borderRadius: scale(16), padding: scale(12) }}>
      <Text style={{ color: palette.muted, fontSize: scale(12), fontWeight: '700' }}>보유 {label}</Text>
      <Text style={{ color: palette.ink, fontSize: scale(22), fontWeight: '800' }}>{formatNumber(value)}</Text>
    </View>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}
