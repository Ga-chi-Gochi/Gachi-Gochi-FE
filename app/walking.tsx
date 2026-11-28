import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { type ComponentProps, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FigButton } from '@/components/fig-button';
import { FigScreen } from '@/components/fig-screen';
import { GyulsaeWear } from '@/components/gyulsae-wear';
import { usePixelNotice } from '@/components/pixel-notice';
import { usePlayState } from '@/components/play-state';
import { TopBar } from '@/components/top-bar';
import { FeatureHelpOverlay } from '@/components/tutorial/feature-help';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import { WalkingConsentFlow } from '@/components/walking-consent-flow';
import { WALKING_INTRO_MESSAGES, WalkingIntroPopup } from '@/components/walking-popup';
import { snapArt, walkArt, walkColor, walkPixelImage, walkUi } from '@/components/walking/walk-assets';
import { useWalkBoardSize, WalkBoard } from '@/components/walking/walk-board';
import { WalkCoinBubble } from '@/components/walking/walk-coin-bubble';
import { shouldPlayWalkGoalFanfare, WalkGoalFanfare } from '@/components/walking/walk-goal-fanfare';
import { WalkHomeInvite } from '@/components/walking/walk-home-invite';
import { WalkProgress } from '@/components/walking/walk-progress';
import { WalkRewardPopup } from '@/components/walking/walk-reward-popup';
import { WalkText } from '@/components/walking/walk-text';
import { WalkButton } from '@/components/walking/walk-wide-button';
import { palette } from '@/constants/palette';
import { WALKING_GOAL, WALKING_REWARD_TIERS } from '@/constants/walking-reward';
import { useHealthAccess } from '@/hooks/use-health-access';
import { useHealthSteps } from '@/hooks/use-health-steps';
import { useResponsive } from '@/hooks/use-responsive';
import { useWalkingReward } from '@/hooks/use-walking-reward';
import { openHealthStepsSettings } from '@/lib/health-steps';
import type { WalkingDataSource } from '@/lib/walking-api';
import { hasSeenWalkingIntro, markWalkingIntroSeen } from '@/lib/walking-reward';

const KCAL_PER_STEP = 0.04;
const STEP_LENGTH_METERS = 0.7;
const DEV_STEP_INCREMENT = 1000;
const LAYOUT = {
  headerHeight: 79,
  headerCenter: 47,
  side: 20,
  back: 50,
  help: 64,
  titleSize: 26,
  boardTop: 130,
  bubbleTop: 332,
  bubble: 130,
  bubbleGap: 4,
  barTop: 473.7,
  barWidth: 334,
  buttonWidth: 350,
  buttonHeight: 47,
  buttonText: 22,
  buttonBottom: 88,
};

// 걷기 화면. 먼저 '건강 앱 접근 허용' 여부를 확인하고,
// 허용했거나 개인정보 수집에 동의한 경우에만 걸음을 불러온다. 거부했으면 동의 흐름을 보여 준다.
export default function WalkingScreen() {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const tutorial = useTutorial();
  const { leaveScreen } = tutorial;
  // 튜토리얼도 최신 걷기 UI 위에서 안내한다 (옛 목업 화면 대신)
  const guided = tutorial.step === 'walking-screen';
  const [helpOpen, setHelpOpen] = useState(false);
  const { status, permission, consented, agree, resetConsent, refreshPermission } = useHealthAccess();

  // 이 화면을 떠나면(뒤로가기·스와이프 모두) 튜토리얼이 다음 단계로 넘어간다
  useFocusEffect(
    useCallback(() => () => leaveScreen('walking'), [leaveScreen]),
  );

  const permissionLabel =
    permission === 'granted' ? '허용' : permission === 'unavailable' ? '이 기기 불가' : permission === 'denied' ? '거부' : '확인 중';

  const devTools = __DEV__ ? (
    <View style={{ gap: scale(8) }}>
      <Text style={{ color: palette.muted, fontSize: scale(12), fontWeight: '700' }}>
        개발용 · 건강 권한: {permissionLabel} · 동의: {consented ? '저장됨' : '없음'}
      </Text>
      <View style={{ flexDirection: 'row', gap: scale(10) }}>
        <FigButton label="건강 권한 다시 확인" tone="white" onPress={() => void refreshPermission()} />
        <FigButton label="건강 설정 열기" tone="white" onPress={() => openHealthStepsSettings()} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <FigButton label="동의 기록 초기화" tone="white" onPress={() => void resetConsent().catch(() => undefined)} />
      </View>
    </View>
  ) : null;

  const showLivePage = guided || status === 'ready';
  const backSize = snapArt(scale(LAYOUT.back), walkArt.button);
  const backLeft = scale(LAYOUT.side) + (scale(LAYOUT.back) - backSize) / 2;
  const backTop = insets.top + scale(LAYOUT.headerCenter) - backSize / 2;

  return (
    <View style={{ flex: 1 }}>
      <FigScreen colors={showLivePage ? [walkColor.background, walkColor.background] : [palette.cream, palette.cream]}>
        {guided ? (
          <WalkingContent guided devTools={null} onHelp={() => setHelpOpen(true)} />
        ) : status === 'checking' ? (
          <TopBar title="걷기" />
        ) : status === 'ready' ? (
          <WalkingContent devTools={devTools} onHelp={() => setHelpOpen(true)} />
        ) : (
          <WalkingConsentFlow onAgree={() => void agree().catch(() => undefined)} onLeave={() => router.replace('/(tabs)')} devTools={devTools} />
        )}
      </FigScreen>
      {guided ? (
        <TutorialOverlay
          step={tutorial.scope === 'full' ? 3 : 1}
          total={tutorial.scope === 'full' ? undefined : 1}
          title="걷기는 이렇게 해요"
          body="걸은 만큼 귤과 경험치를 받아요. 이 경험치로도 고치가 자라요."
          hint="왼쪽 위 뒤로가기를 눌러 섬으로 돌아가요"
          hole={() => {
            const pad = scale(4);
            return {
              left: backLeft - pad,
              top: backTop - pad,
              width: backSize + pad * 2,
              height: backSize + pad * 2,
              radius: scale(12),
            };
          }}
          placement="below"
          align="start"
          onSkip={() => {
            tutorial.skip();
            router.replace('/(tabs)');
          }}
          interceptBack={false}
          zIndex={100}
        />
      ) : null}
      {helpOpen && !guided ? <FeatureHelpOverlay topic="walking" onClose={() => setHelpOpen(false)} zIndex={90} /> : null}
    </View>
  );
}

// 권한·동의 확인이 끝난 뒤에 보이는 걷기 본문. HealthKit / Health Connect 로 오늘 걸음을 불러온다.
function WalkingContent({
  guided = false,
  devTools,
  onHelp,
}: {
  guided?: boolean;
  devTools: ReactNode;
  onHelp: () => void;
}) {
  const { scale, width } = useResponsive();
  const insets = useSafeAreaInsets();
  const { steps: healthSteps, distanceMeters: healthDistance, status: stepStatus, source, refresh } = useHealthSteps();
  const [devSteps, setDevSteps] = useState(0);
  const steps = healthSteps + devSteps;
  const distanceMeters = healthDistance ?? Math.round(steps * STEP_LENGTH_METERS);
  const stepSource: WalkingDataSource = source ?? 'mock';
  const isLoaded = stepStatus !== 'loading';
  const unreadable = stepStatus === 'unavailable' && devSteps === 0;
  const {
    claimedSteps,
    pendingSteps,
    claim,
    claiming,
    reward,
    saveError,
    dismissReward,
    retrySave,
    resetTodayClaims,
    mockSaveFailure,
    setMockSaveFailure,
  } = useWalkingReward({
    steps,
    distanceMeters,
    source: stepSource,
  });
  const { coins, growthStage, equipped } = usePlayState();
  const { show: showNotice, element: noticeElement } = usePixelNotice();
  const [introStep, setIntroStep] = useState<number | null>(null);
  const [introChecked, setIntroChecked] = useState(false);

  useEffect(() => {
    if (guided) {
      setIntroChecked(true);
      return;
    }
    hasSeenWalkingIntro()
      .then((seen) => {
        if (!seen) {
          setIntroStep(0);
        }
      })
      .catch(() => undefined)
      .finally(() => setIntroChecked(true));
  }, [guided]);

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
        setDevSteps(0);
      }
    });
  }, [resetTodayClaims]);


  const showIntro = introStep != null;
  const celebrating = reward != null;

  const deniedNoticeShown = useRef(false);
  useEffect(() => {
    if (guided || stepStatus !== 'denied') {
      deniedNoticeShown.current = false;
      return;
    }
    if (!introChecked || showIntro || celebrating || deniedNoticeShown.current) {
      return;
    }
    deniedNoticeShown.current = true;
    showNotice({
      title: '걸음 수 권한이 필요해요',
      message:
        '아이폰은 건강 앱, 안드로이드는 Health Connect 에서 가치고치의 걸음 읽기를 허용해 주세요.',
      buttons: [
        { label: '설정 열기', onPress: () => openHealthStepsSettings() },
        { label: '다시 확인', onPress: () => void refresh() },
      ],
    });
  }, [celebrating, guided, introChecked, refresh, showIntro, showNotice, stepStatus]);

  const kcal = Math.round(steps * KCAL_PER_STEP);
  const canClaim = pendingSteps.length > 0 && !claiming;
  const board = useWalkBoardSize();
  const header = scale(LAYOUT.headerHeight);
  const backSize = snapArt(scale(LAYOUT.back), walkArt.button);
  const helpSize = snapArt(scale(LAYOUT.help), walkArt.button);
  const centerY = scale(LAYOUT.headerCenter);

  return (
    <>
      <View style={{ height: header }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="섬으로 돌아가기"
          onPress={() => router.replace('/(tabs)')}
          hitSlop={4}
          style={({ pressed }) => ({ position: 'absolute', left: scale(LAYOUT.side) + (scale(LAYOUT.back) - backSize) / 2, top: centerY - backSize / 2, opacity: pressed ? 0.75 : 1 })}>
          <Image source={walkUi.back} style={{ width: backSize, height: backSize, ...walkPixelImage }} contentFit="fill" />
        </Pressable>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: centerY - scale(LAYOUT.titleSize), height: scale(LAYOUT.titleSize) * 2, justifyContent: 'center' }}>
          <WalkText size={LAYOUT.titleSize} center color={walkColor.title}>
            걷기
          </WalkText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="걷기 도움말"
          onPress={onHelp}
          hitSlop={4}
          style={({ pressed }) => ({ position: 'absolute', right: scale(LAYOUT.side) + (scale(LAYOUT.help) - helpSize) / 2, top: centerY - helpSize / 2, opacity: pressed ? 0.75 : 1 })}>
          <Image source={walkUi.help} style={{ width: helpSize, height: helpSize, ...walkPixelImage }} contentFit="fill" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: scale(LAYOUT.boardTop) - header, paddingBottom: scale(16) }}>
        <WalkBoard
          stepsLabel={isLoaded || unreadable ? String(steps) : '-'}
          statsLabel={`${formatKm(distanceMeters)}km · ${formatNumber(kcal)}Kcal`}
          accessibilityLabel={
            unreadable ? '이 기기에서는 걸음 수를 읽을 수 없어요' : isLoaded ? `오늘 ${formatNumber(steps)} 걸음, 목표 ${formatNumber(WALKING_GOAL)} 걸음` : '걸음 수를 불러오는 중'
          }
        />
        <View style={{ marginTop: scale(LAYOUT.bubbleTop - LAYOUT.boardTop) - board.height, height: scale(LAYOUT.bubble), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(LAYOUT.bubbleGap) }}>
          <WalkCoinBubble coins={coins} size={scale(LAYOUT.bubble)} />
          <GyulsaeWear level={growthStage.level} size={scale(LAYOUT.bubble)} equipped={equipped} />
        </View>
        <View style={{ marginTop: scale(LAYOUT.barTop - LAYOUT.bubbleTop - LAYOUT.bubble) }}>
          <WalkProgress steps={steps} claimedSteps={claimedSteps} pendingSteps={pendingSteps} width={scale(LAYOUT.barWidth)} />
        </View>
        <View style={{ paddingHorizontal: scale(16), paddingTop: scale(20), gap: scale(14) }}>
          {unreadable ? (
            <WalkText size={11} center color={walkColor.grayText}>
              이 기기에서는 걸음 수를 읽을 수 없어요
            </WalkText>
          ) : null}
          {stepStatus === 'ready' && steps === 0 ? (
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
              onAction={() => void retrySave()}
            />
          ) : null}
          {__DEV__ ? (
            <View style={{ gap: scale(8) }}>
              <Text style={{ color: palette.muted, fontSize: scale(12), fontWeight: '700' }}>개발용 (배포 빌드에서는 보이지 않아요)</Text>
              <View style={{ flexDirection: 'row', gap: scale(10) }}>
                <FigButton label={`+${DEV_STEP_INCREMENT}걸음 테스트`} tone="white" onPress={() => setDevSteps((current) => current + DEV_STEP_INCREMENT)} />
                <FigButton label="오늘 기록 초기화" tone="white" onPress={resetToday} />
              </View>
              <View style={{ flexDirection: 'row', gap: scale(10) }}>
                <FigButton label={`저장 실패로 테스트: ${mockSaveFailure ? '켜짐' : '꺼짐'}`} tone="white" onPress={() => setMockSaveFailure(!mockSaveFailure)} />
              </View>
            </View>
          ) : null}
          {devTools}
        </View>
      </ScrollView>
      <View style={{ paddingTop: scale(8), marginBottom: Math.max(scale(8), scale(LAYOUT.buttonBottom) - insets.bottom) }}>
        <WalkButton
          label={pendingSteps.length > 0 ? '보상 받게' : '호꼼만 뒤에 보게'}
          disabled={!canClaim}
          onPress={() => void claim()}
          width={Math.min(scale(LAYOUT.buttonWidth), width - scale(20) * 2)}
          height={LAYOUT.buttonHeight}
          textSize={LAYOUT.buttonText}
        />
      </View>
      {!guided && showIntro ? <WalkingIntroPopup step={introStep} onNext={nextIntro} /> : null}
      {!guided && reward && introChecked && !showIntro ? (
        shouldPlayWalkGoalFanfare(reward) ? (
          <WalkGoalFanfare reward={reward} claimedSteps={claimedSteps} onDone={dismissReward} />
        ) : (
          <WalkRewardPopup coins={reward.coins} xp={reward.xp} steps={reward.topSteps} onConfirm={dismissReward} />
        )
      ) : null}
      <WalkHomeInvite hidden={guided || showIntro || reward != null} />
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
