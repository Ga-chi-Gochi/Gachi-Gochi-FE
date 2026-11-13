import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { FigButton } from '@/components/fig-button';
import { FigScreen } from '@/components/fig-screen';
import { HomeTopBar, HomeTopIcons, useHomeTopLayout } from '@/components/home-top-bar';
import { PixelText } from '@/components/pixel/pixel-ui';
import { usePixelNotice } from '@/components/pixel-notice';
import { usePlayState } from '@/components/play-state';
import { TopBar } from '@/components/top-bar';
import { WalkingConsentFlow } from '@/components/walking-consent-flow';
import { WalkingGyulsae } from '@/components/walking-gyulsae';
import { WALKING_INTRO_MESSAGES, WalkingIntroPopup, walkingRewardNotice } from '@/components/walking-popup';
import { WalkingRewardBoard } from '@/components/walking-reward-board';
import { palette } from '@/constants/palette';
import { pixel } from '@/constants/pixel-theme';
import { WALKING_REWARD_TIERS } from '@/constants/walking-reward';
import { useHealthAccess } from '@/hooks/use-health-access';
import { useResponsive } from '@/hooks/use-responsive';
import { useTodaySteps } from '@/hooks/use-today-steps';
import { useWalkingReward } from '@/hooks/use-walking-reward';
import { hasSeenWalkingIntro, markWalkingIntroSeen } from '@/lib/walking-reward';

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
        <WalkingConsentFlow onAgree={() => void agree().catch(() => undefined)} onLeave={() => router.replace('/(tabs)')} devTools={devTools} />
      )}
    </FigScreen>
  );
}

const KCAL_PER_STEP = 0.04;

// 권한·동의 확인이 끝난 뒤에 보이는 걷기 본문. 이 컴포넌트가 나타날 때 걸음을 불러온다.
function WalkingContent({ devTools }: { devTools: ReactNode }) {
  const { scale } = useResponsive();
  const { steps, distanceMeters, source, isLoaded, error, refresh, addMockSteps, resetMockSteps, mockReadFailure, setMockReadFailure } = useTodaySteps();
  const { claimedSteps, reward, saveError, dismissReward, retrySave, resetTodayClaims, mockSaveFailure, setMockSaveFailure } = useWalkingReward({ steps, distanceMeters, source });
  const { coins } = usePlayState();
  const { iconsInset, iconsHeight } = useHomeTopLayout();
  const { show: showNotice, element: noticeElement } = usePixelNotice();
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
    void resetTodayClaims().then((done) => {
      if (done) {
        resetMockSteps();
      }
    });
  }, [resetMockSteps, resetTodayClaims]);

  const showIntro = introStep != null;

  useEffect(() => {
    if (!introChecked || showIntro || !reward) {
      return;
    }
    showNotice(walkingRewardNotice(reward));
    dismissReward();
  }, [dismissReward, introChecked, reward, showIntro, showNotice]);

  return (
    <>
      <View
        style={{
          paddingLeft: scale(16),
          paddingRight: scale(16) + iconsInset,
          paddingTop: scale(8),
          paddingBottom: scale(10),
          minHeight: scale(18) + iconsHeight,
          zIndex: 10,
        }}>
        <HomeTopBar />
        <HomeTopIcons top={scale(8)} side={scale(16)} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: scale(16), gap: scale(14) }}>
        {error ? (
          <NoticeCard
            icon="sync-problem"
            warning
            title="걸음 수를 불러오지 못했어요"
            message="건강 앱이 켜져 있는지 확인한 뒤 아래 버튼을 눌러 주세요."
            actionLabel="다시 시도"
            onAction={() => void refresh()}
          />
        ) : isLoaded && steps === 0 ? (
          <NoticeCard
            icon="directions-walk"
            title="아직 오늘 걸은 기록이 없어요"
            message={`조금만 걸어도 여기에 걸음 수가 나타나요. ${formatNumber(WALKING_REWARD_TIERS[0].steps)}걸음부터 귤을 받을 수 있어요.`}
          />
        ) : null}
        {saveError ? (
          <NoticeCard
            icon="cloud-off"
            warning
            title="보상을 기록하지 못했어요"
            message="받을 귤과 XP는 사라지지 않아요. 아래 버튼을 눌러 다시 기록해 주세요."
            actionLabel="다시 시도"
            onAction={retrySave}
          />
        ) : null}
        <View style={{ alignItems: 'center', gap: scale(6) }}>
          <Text accessibilityLabel={`오늘 ${formatNumber(steps)} 걸음`} style={{ color: pixel.ink, fontWeight: '800' }}>
            <Text style={{ fontSize: scale(44) }}>{formatNumber(steps)}</Text>
            <Text style={{ fontSize: scale(18) }}> 걸음</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: scale(16) }}>
            <PixelText size={14} color={pixel.muted}>{formatKm(distanceMeters)}km</PixelText>
            <PixelText size={14} color={pixel.muted}>{formatNumber(Math.round(steps * KCAL_PER_STEP))}kcal</PixelText>
          </View>
        </View>
        <WalkingGyulsae size={scale(200)} />
        <WalkingRewardBoard steps={steps} claimedSteps={claimedSteps} coins={coins} />
        {__DEV__ ? (
          <View style={{ gap: scale(8) }}>
            <Text style={{ color: palette.muted, fontSize: scale(12), fontWeight: '700' }}>개발용 (배포 빌드에서는 보이지 않아요)</Text>
            <View style={{ flexDirection: 'row', gap: scale(10) }}>
              <FigButton label="+500보" tone="white" onPress={addMockSteps} />
              <FigButton label="오늘 기록 초기화" tone="white" onPress={resetToday} />
            </View>
            <View style={{ flexDirection: 'row', gap: scale(10) }}>
              <FigButton label={`불러오기 실패로 테스트: ${mockReadFailure ? '켜짐' : '꺼짐'}`} tone="white" onPress={() => setMockReadFailure(!mockReadFailure)} />
              <FigButton label={`저장 실패로 테스트: ${mockSaveFailure ? '켜짐' : '꺼짐'}`} tone="white" onPress={() => setMockSaveFailure(!mockSaveFailure)} />
            </View>
          </View>
        ) : null}
        {devTools}
      </ScrollView>
      <View style={{ flexDirection: 'row', paddingHorizontal: scale(24), marginBottom: scale(8) }}>
        <FigButton label="섬으로 돌아가기" onPress={() => router.replace('/(tabs)')} />
      </View>
      {showIntro ? <WalkingIntroPopup step={introStep} onNext={nextIntro} /> : null}
      {noticeElement}
    </>
  );
}

// 걷기 화면 위쪽에 띄우는 안내 카드. warning이면 문제 상황 색으로 보여 주고, onAction을 넘기면 버튼이 생긴다.
function NoticeCard({
  icon,
  title,
  message,
  warning = false,
  actionLabel,
  onAction,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  message: string;
  warning?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { scale } = useResponsive();

  return (
    <View accessibilityRole={warning ? 'alert' : undefined} style={{ backgroundColor: warning ? palette.blush : palette.seaSoft, borderRadius: scale(24), padding: scale(18), gap: scale(12) }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: scale(10) }}>
        <MaterialIcons name={icon} size={scale(22)} color={warning ? palette.tangerineDeep : palette.sea} />
        <View style={{ flex: 1, gap: scale(4) }}>
          <Text style={{ color: palette.ink, fontSize: scale(16), fontWeight: '800' }}>{title}</Text>
          <Text style={{ color: palette.body, fontSize: scale(13), lineHeight: scale(19) }}>{message}</Text>
        </View>
      </View>
      {actionLabel && onAction ? (
        <View style={{ flexDirection: 'row' }}>
          <FigButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

function formatKm(meters: number) {
  return String(Number((meters / 1000).toFixed(1)));
}
