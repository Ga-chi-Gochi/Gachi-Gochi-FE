import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { GachiButton, GachiIconButton } from '@/components/gachi-ui/gachi-button';
import { GachiCoinBadge } from '@/components/gachi-ui/gachi-hud';
import type { SpotlightHole } from '@/components/guide/guide-spotlight';
import { ExploreEggReward } from '@/components/island/explore-egg-reward';
import { ExploreWaitingAnim } from '@/components/island/explore-waiting-anim';
import { usePlayState } from '@/components/play-state';
import { EXPLORE_TOUR_TOTAL } from '@/components/tutorial/explore-unlock-tour';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import {
  canSendExploreCharacter,
  EXPLORE_CHARACTERS,
  EXPLORE_COURSES,
  exploreCharacterLockReason,
  formatExploreReturnLabel,
  getExploreCharacter,
  getExploreCourse,
  getExploreGochi,
  ownedExploreCharacterIds,
  type ExploreCharacterId,
  type ExploreCourseId,
} from '@/constants/explore';
import { gachiUi } from '@/constants/gachi-ui';
import { EXPLORE_TUTORIAL_EGG_ID } from '@/constants/gochi-eggs';
import { ISLAND_HOME } from '@/constants/routes';
import { uiButtons } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';
import { saveExploreIntroSeen, saveExploreRewardIntroSeen } from '@/lib/explore-intro-state';

type ViewNode = ComponentRef<typeof View>;

function measureHole(node: ViewNode | null, pad: number): Promise<SpotlightHole | null> {
  return new Promise((resolve) => {
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        resolve(null);
        return;
      }
      resolve({
        left: x - pad,
        top: y - pad,
        width: width + pad * 2,
        height: height + pad * 2,
        radius: pad,
      });
    });
  });
}

function leaveExplore() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(ISLAND_HOME);
}

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;
const ICON_GREEN = '#A8D18D';
const SELECT_ORANGE = '#E89A3C';
const TIP_MINT = '#D7EBD0';

type Step = 'course' | 'character';

/**
 * 모험 보내기 — 와프 2페이지
 * 1) 코스 선택  2) 캐릭터 선택 + 보내기
 */
export default function ExploreScreen() {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const {
    coins,
    growthStage,
    exploreForestUnlocked,
    exploreRemaining,
    exploreDailyLimit,
    isExploring,
    hasExploreReward,
    canStartExplore,
    pendingExploreGochiId,
    exploreEggReveal,
    startExplore,
    claimExploreEgg,
    acknowledgeExploreEggReveal,
    syncExplore,
  } = usePlayState();

  const [step, setStep] = useState<Step>('course');
  const [selectedCourseId, setSelectedCourseId] = useState<ExploreCourseId | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<ExploreCharacterId | null>(null);
  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  /** 파견 성공 직후 보상/코스 UI가 깜빡이지 않게 */
  const [suppressStatus, setSuppressStatus] = useState(false);
  const { step: tutorialStep, scope: tutorialScope, goTo: goTutorial, skip: skipTutorial } = useTutorial();
  const courseListRef = useRef<ViewNode>(null);
  const characterRowRef = useRef<ViewNode>(null);
  const sendRef = useRef<ViewNode>(null);
  const claimRef = useRef<ViewNode>(null);
  const [courseHole, setCourseHole] = useState<SpotlightHole | null>(null);
  const [characterHole, setCharacterHole] = useState<SpotlightHole | null>(null);
  const [sendHole, setSendHole] = useState<SpotlightHole | null>(null);
  const [claimHole, setClaimHole] = useState<SpotlightHole | null>(null);
  const exploreTour =
    tutorialScope === 'explore' &&
    (tutorialStep === 'explore-course' ||
      tutorialStep === 'explore-character' ||
      tutorialStep === 'explore-send');
  const exploreRewardTour =
    tutorialScope === 'explore' &&
    (tutorialStep === 'explore-reward' || tutorialStep === 'explore-reward-button');
  const tourLeaveRef = useRef({
    scope: tutorialScope,
    step: tutorialStep,
    skip: skipTutorial,
  });

  useEffect(() => {
    tourLeaveRef.current = { scope: tutorialScope, step: tutorialStep, skip: skipTutorial };
  }, [skipTutorial, tutorialScope, tutorialStep]);

  const finishExploreTour = useCallback(() => {
    void saveExploreIntroSeen();
    skipTutorial();
  }, [skipTutorial]);

  useFocusEffect(
    useCallback(() => {
      void syncExplore();
      return () => {
        // 탐험 화면을 나가면(뒤로가기) 화면 안 튜토리얼도 종료
        const { scope, step, skip } = tourLeaveRef.current;
        if (
          scope === 'explore' &&
          (step === 'explore-course' || step === 'explore-character' || step === 'explore-send')
        ) {
          void saveExploreIntroSeen();
          skip();
        }
      };
    }, [syncExplore]),
  );

  useEffect(() => {
    if (!exploreTour && !exploreRewardTour) {
      return;
    }
    const pad = scale(6);
    const id = requestAnimationFrame(() => {
      if (tutorialStep === 'explore-course') {
        void measureHole(courseListRef.current, pad).then(setCourseHole);
      }
      if (tutorialStep === 'explore-character') {
        void measureHole(characterRowRef.current, pad).then(setCharacterHole);
      }
      if (tutorialStep === 'explore-send') {
        // 버튼 실측 크기에 맞게 패딩을 얇게
        void measureHole(sendRef.current, scale(2)).then(setSendHole);
      }
      if (tutorialStep === 'explore-reward-button') {
        void measureHole(claimRef.current, scale(2)).then(setClaimHole);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [exploreRewardTour, exploreTour, scale, tutorialStep, step, hasExploreReward]);

  const selectedCourse = useMemo(
    () => getExploreCourse(selectedCourseId),
    [selectedCourseId],
  );

  const selectedCharacter = useMemo(
    () => getExploreCharacter(selectedCharacterId),
    [selectedCharacterId],
  );

  const activeName = useMemo(() => {
    const id = hasExploreReward ? pendingExploreGochiId : selectedCharacterId;
    return getExploreGochi(id)?.name ?? getExploreCharacter(id as ExploreCharacterId)?.name ?? '귤새';
  }, [hasExploreReward, pendingExploreGochiId, selectedCharacterId]);

  // 탐험 중 현황 페이지는 없앰 — 들어오면 섬으로 돌려보낸다
  useEffect(() => {
    if (isExploring && !hasExploreReward && !suppressStatus) {
      leaveExplore();
    }
  }, [hasExploreReward, isExploring, suppressStatus]);

  /** 보유한 고치 종류만 — 레벨로 young/adult를 같이 열지 않음 */
  const ownedCharacterIds = useMemo(
    () => ownedExploreCharacterIds(growthStage.level),
    [growthStage.level],
  );

  const ownedCharacters = useMemo(
    () =>
      EXPLORE_CHARACTERS.filter(
        (entry) => entry.id !== 'egg' && ownedCharacterIds.includes(entry.id),
      ),
    [ownedCharacterIds],
  );

  const pickDefaultCharacter = useCallback(
    (courseId: ExploreCourseId) => {
      const course = getExploreCourse(courseId);
      if (!course) {
        return;
      }
      const eligible = ownedCharacters.filter((entry) =>
        canSendExploreCharacter(entry, ownedCharacterIds, course.hours),
      );
      setSelectedCharacterId(eligible[0]?.id ?? null);
    },
    [ownedCharacterIds, ownedCharacters],
  );

  const onSelectCourse = (courseId: ExploreCourseId) => {
    if (!exploreForestUnlocked || exploreRemaining <= 0 || isExploring || hasExploreReward) {
      return;
    }
    setSelectedCourseId(courseId);
    pickDefaultCharacter(courseId);
    setStep('character');
    if (tutorialScope === 'explore' && tutorialStep === 'explore-course') {
      goTutorial('explore-character');
    }
  };

  const onBack = () => {
    if (step === 'character' && !isExploring && !hasExploreReward) {
      setStep('course');
      if (
        tutorialScope === 'explore' &&
        (tutorialStep === 'explore-character' || tutorialStep === 'explore-send')
      ) {
        goTutorial('explore-course');
      }
      return;
    }
    leaveExplore();
  };

  const canDispatch =
    canStartExplore &&
    !!selectedCourse &&
    !!selectedCharacter &&
    canSendExploreCharacter(selectedCharacter, ownedCharacterIds, selectedCourse.hours);

  const onDispatch = async () => {
    if (!canDispatch || sending || !selectedCourse || !selectedCharacter) {
      return;
    }
    setSending(true);
    try {
      const ok = await startExplore({
        gochiId: selectedCharacter.id,
        durationMs: selectedCourse.durationMs,
      });
      if (ok) {
        if (tutorialScope === 'explore') {
          // 홈에서 진행 중 안내로 이어간다 (blur 정리에서 끊기지 않게 ref 먼저 맞춤)
          tourLeaveRef.current = {
            scope: 'explore',
            step: 'explore-progress',
            skip: skipTutorial,
          };
          goTutorial('explore-progress');
        }
        setSuppressStatus(true);
        leaveExplore();
      }
    } finally {
      setSending(false);
    }
  };

  const onClaim = async () => {
    if (!hasExploreReward || claiming) {
      return;
    }
    setClaiming(true);
    try {
      await claimExploreEgg(
        tutorialScope === 'explore' ? { eggId: EXPLORE_TUTORIAL_EGG_ID } : undefined,
      );
      if (
        tutorialScope === 'explore' &&
        (tutorialStep === 'explore-reward' || tutorialStep === 'explore-reward-button')
      ) {
        void saveExploreRewardIntroSeen();
        skipTutorial();
      }
    } finally {
      setClaiming(false);
    }
  };

  const padX = scale(16);
  const border = scale(gachiUi.border);

  return (
    <View style={{ flex: 1, backgroundColor: gachiUi.cream, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: padX,
          paddingTop: scale(8),
          paddingBottom: scale(4),
        }}>
        <GachiIconButton kind="squareBack" label="뒤로" size={32} onPress={onBack} />
        <GalmuriText size={14} bold center>
          모험 보내기
        </GalmuriText>
        <GachiCoinBadge value={coins} />
      </View>

      {hasExploreReward && !suppressStatus ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: padX,
            paddingTop: scale(12),
            paddingBottom: Math.max(insets.bottom, scale(20)) + scale(12),
            gap: scale(14),
            alignItems: 'center',
          }}>
          <ExploreWaitingAnim gochiId={pendingExploreGochiId} variant="full" />
          <View
            style={{
              width: '100%',
              padding: scale(14),
              borderWidth: border,
              borderColor: gachiUi.ink,
              backgroundColor: gachiUi.panel,
              borderRadius: scale(8),
              gap: scale(8),
              alignItems: 'center',
            }}>
            <GalmuriText size={12} bold center>
              고치가 무언가를 찾아왔수다!
            </GalmuriText>
            <GalmuriText size={9} color={gachiUi.inkSoft} center>
              {activeName}가 숲에서 무언가를 들고 돌아왔어요
            </GalmuriText>
          </View>
          <View
            ref={claimRef}
            collapsable={false}
            onLayout={() => {
              if (tutorialStep === 'explore-reward-button') {
                void measureHole(claimRef.current, scale(2)).then(setClaimHole);
              }
            }}>
            <GachiButton
              label={claiming ? '받는 중…' : '받아 봅서'}
              tone="green"
              width="wide"
              disabled={claiming}
              onPress={() => {
                void onClaim();
              }}
            />
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: padX,
            paddingTop: scale(8),
            paddingBottom: Math.max(insets.bottom, scale(20)) + scale(12),
            gap: scale(12),
          }}>
          {step === 'course' ? (
            <>
              <GalmuriText size={9} color={gachiUi.inkSoft} center>
                오늘 남은 모험 {exploreRemaining}/{exploreDailyLimit} · 매일 0시 충전
              </GalmuriText>

              {!exploreForestUnlocked ? (
                <View
                  style={{
                    padding: scale(12),
                    borderWidth: border,
                    borderColor: gachiUi.ink,
                    backgroundColor: gachiUi.beige,
                    borderRadius: scale(8),
                  }}>
                  <GalmuriText size={11} bold center>
                    서쪽 숲을 먼저 열어주세요
                  </GalmuriText>
                  <GalmuriText size={9} color={gachiUi.inkSoft} center>
                    섬 넓히기로 서쪽 숲을 열면 모험할 수 있어요
                  </GalmuriText>
                </View>
              ) : null}

              <View
                ref={courseListRef}
                collapsable={false}
                onLayout={() => {
                  if (tutorialStep === 'explore-course') {
                    void measureHole(courseListRef.current, scale(6)).then(setCourseHole);
                  }
                }}
                style={{ gap: scale(12) }}>
                {EXPLORE_COURSES.map((course) => {
                  const disabled = !exploreForestUnlocked || exploreRemaining <= 0;
                  return (
                    <View
                      key={course.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: scale(12),
                        padding: scale(12),
                        borderWidth: border,
                        borderColor: gachiUi.ink,
                        backgroundColor: gachiUi.panel,
                        borderRadius: scale(10),
                        opacity: disabled ? 0.55 : 1,
                      }}>
                      <View
                        style={{
                          width: scale(56),
                          height: scale(56),
                          borderRadius: scale(8),
                          backgroundColor: ICON_GREEN,
                          borderWidth: border,
                          borderColor: gachiUi.ink,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Image
                          source={course.icon}
                          style={{ width: scale(44), height: scale(44), ...pixelImageStyle }}
                          contentFit="contain"
                        />
                      </View>
                      <View style={{ flex: 1, gap: scale(4) }}>
                        <GalmuriText size={12} bold>
                          {course.name}
                        </GalmuriText>
                        <GalmuriText size={9} color={gachiUi.inkSoft}>
                          {course.hours}시간 · 알 {course.eggChance}% / {course.itemLabel}{' '}
                          {course.itemChance}%
                        </GalmuriText>
                        <View style={{ alignItems: 'flex-end', marginTop: scale(4) }}>
                          <GachiButton
                            label="선택"
                            tone="beige"
                            disabled={disabled}
                            onPress={() => onSelectCourse(course.id)}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View
                style={{
                  paddingVertical: scale(10),
                  paddingHorizontal: scale(12),
                  borderWidth: border,
                  borderColor: gachiUi.ink,
                  backgroundColor: TIP_MINT,
                  borderRadius: scale(8),
                }}>
                <GalmuriText size={9} center>
                  귤새는 숲을 좋아해요 · 동백 숲길 보상 +10%
                </GalmuriText>
              </View>
            </>
          ) : (
            <>
              <View style={{ gap: scale(4) }}>
                <GalmuriText size={12} bold>
                  누구를 보낼까요?
                </GalmuriText>
                <GalmuriText size={9} color={gachiUi.inkSoft}>
                  가지고 있는 고치만 보낼 수 있어요
                </GalmuriText>
              </View>

              <View
                ref={characterRowRef}
                collapsable={false}
                onLayout={() => {
                  if (tutorialStep === 'explore-character') {
                    void measureHole(characterRowRef.current, scale(6)).then(setCharacterHole);
                  }
                }}
                style={{ flexDirection: 'row', gap: scale(8) }}>
                {ownedCharacters.length === 0 ? (
                  <View
                    style={{
                      flex: 1,
                      paddingVertical: scale(16),
                      paddingHorizontal: scale(12),
                      borderWidth: border,
                      borderColor: gachiUi.ink,
                      backgroundColor: gachiUi.panel,
                      borderRadius: scale(10),
                    }}>
                    <GalmuriText size={9} color={gachiUi.inkSoft} center>
                      보낼 수 있는 고치가 없어요. 부화한 뒤 다시 와요
                    </GalmuriText>
                  </View>
                ) : (
                  ownedCharacters.map((character) => {
                    const courseHours = selectedCourse?.hours ?? 0;
                    const unlocked = selectedCourse
                      ? canSendExploreCharacter(character, ownedCharacterIds, courseHours)
                      : false;
                    const lockReason = selectedCourse
                      ? exploreCharacterLockReason(character, ownedCharacterIds, courseHours)
                      : null;
                    const selected = selectedCharacterId === character.id;
                    return (
                      <Pressable
                        key={character.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected, disabled: !unlocked }}
                        disabled={!unlocked}
                        onPress={() => {
                          setSelectedCharacterId(character.id);
                          if (tutorialScope === 'explore' && tutorialStep === 'explore-character') {
                            goTutorial('explore-send');
                          }
                        }}
                        style={{
                          flex: 1,
                          alignItems: 'center',
                          gap: scale(6),
                          paddingVertical: scale(10),
                          paddingHorizontal: scale(4),
                          borderWidth: scale(selected ? 3 : gachiUi.border),
                          borderColor: selected ? SELECT_ORANGE : gachiUi.ink,
                          backgroundColor: gachiUi.panel,
                          borderRadius: scale(10),
                          opacity: unlocked ? 1 : 0.45,
                        }}>
                        <Image
                          source={character.icon}
                          style={{ width: scale(48), height: scale(48), ...pixelImageStyle }}
                          contentFit="contain"
                        />
                        <GalmuriText size={9} bold center numberOfLines={1}>
                          {character.name}
                        </GalmuriText>
                        <GalmuriText size={7} color={gachiUi.inkSoft} center numberOfLines={2}>
                          {lockReason ?? character.detail}
                        </GalmuriText>
                      </Pressable>
                    );
                  })
                )}
              </View>

              {selectedCourse ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(12),
                    padding: scale(14),
                    borderWidth: border,
                    borderColor: gachiUi.ink,
                    backgroundColor: gachiUi.panel,
                    borderRadius: scale(10),
                  }}>
                  <View
                    style={{
                      width: scale(52),
                      height: scale(52),
                      borderRadius: scale(8),
                      backgroundColor: ICON_GREEN,
                      borderWidth: border,
                      borderColor: gachiUi.ink,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Image
                      source={selectedCourse.icon}
                      style={{ width: scale(40), height: scale(40), ...pixelImageStyle }}
                      contentFit="contain"
                    />
                  </View>
                  <View style={{ flex: 1, gap: scale(4) }}>
                    <GalmuriText size={11} bold>
                      {selectedCourse.name} · {selectedCourse.hours}시간
                    </GalmuriText>
                    <GalmuriText size={9} color={gachiUi.inkSoft}>
                      {formatExploreReturnLabel(selectedCourse.hours)}
                    </GalmuriText>
                    <GalmuriText size={8} color={gachiUi.inkSoft}>
                      오늘 5,000걸음 걸으면 30분 단축
                    </GalmuriText>
                  </View>
                </View>
              ) : null}

              <View style={{ alignItems: 'center', marginTop: scale(8) }}>
                <View
                  ref={sendRef}
                  collapsable={false}
                  onLayout={() => {
                    if (tutorialStep === 'explore-send') {
                      void measureHole(sendRef.current, scale(2)).then(setSendHole);
                    }
                  }}>
                  <AssetImageButton
                    source={uiButtons.greenAdventure}
                    label={sending ? '보내는 중…' : '모험 보내기'}
                    width={170}
                    height={40}
                    disabled={!canDispatch || sending}
                    onPress={() => {
                      void onDispatch();
                    }}
                  />
                </View>
                {!canDispatch && exploreForestUnlocked ? (
                  <GalmuriText size={8} color={gachiUi.inkSoft} center style={{ marginTop: scale(8) }}>
                    {exploreRemaining <= 0
                      ? '오늘 모험은 모두 끝났어요'
                      : ownedCharacters.length === 0
                        ? '보낼 수 있는 고치가 없어요. 부화 후 다시 와요'
                        : !selectedCharacter
                          ? '이 코스에 보낼 수 있는 고치가 없어요'
                          : '보낼 고치를 골라 주세요'}
                  </GalmuriText>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {tutorialStep === 'explore-course' && tutorialScope === 'explore' ? (
        <TutorialOverlay
          step={3}
          total={EXPLORE_TOUR_TOTAL}
          title="어디로 보낼까요?"
          body="시간이 길수록 알을 가져올 확률이 높아져요. 원하는 코스의 선택을 눌러 보세요."
          hint="코스를 골라 보세요"
          placement="below"
          align="center"
          hole={courseHole ? () => courseHole : undefined}
          onSkip={finishExploreTour}
          interceptBack={false}
          zIndex={100}
        />
      ) : null}

      {tutorialStep === 'explore-character' && tutorialScope === 'explore' ? (
        <TutorialOverlay
          step={4}
          total={EXPLORE_TOUR_TOTAL}
          title="누구를 보낼까요?"
          body="성장한 캐릭터일수록 더 긴 코스에 갈 수 있어요. 보낼 캐릭터를 눌러 보세요."
          hint="캐릭터를 골라 보세요"
          placement="below"
          align="center"
          hole={characterHole ? () => characterHole : undefined}
          onSkip={finishExploreTour}
          interceptBack={false}
          zIndex={100}
        />
      ) : null}

      {tutorialStep === 'explore-send' && tutorialScope === 'explore' ? (
        <TutorialOverlay
          step={5}
          total={EXPLORE_TOUR_TOTAL}
          title="모험을 보내 봅서"
          body="모험 보내기를 누르면 고치가 떠나요. 시간이 지나면 섬으로 돌아와 알을 줄 수 있어요."
          hint="모험 보내기를 눌러 보세요"
          placement="above"
          align="center"
          hole={sendHole ? () => sendHole : undefined}
          onSkip={finishExploreTour}
          interceptBack={false}
          zIndex={100}
        />
      ) : null}

      {hasExploreReward && !suppressStatus && tutorialStep === 'explore-reward' && tutorialScope === 'explore' ? (
        <TutorialOverlay
          step={7}
          total={EXPLORE_TOUR_TOTAL}
          title="고치가 돌아왔수다!"
          body="고치가 숲에서 무언가를 찾아왔어요. 다음을 눌러 받아 봅서를 확인해 보세요."
          placement="center"
          primary={{
            label: '다음',
            onPress: () => goTutorial('explore-reward-button'),
          }}
          onSkip={() => {
            void saveExploreRewardIntroSeen();
            skipTutorial();
          }}
          interceptBack={false}
          zIndex={100}
        />
      ) : null}

      {hasExploreReward &&
      !suppressStatus &&
      tutorialStep === 'explore-reward-button' &&
      tutorialScope === 'explore' ? (
        <TutorialOverlay
          step={8}
          total={EXPLORE_TOUR_TOTAL}
          title="받아 봅서!"
          body="받아 봅서를 누르면 고치가 가져온 걸 확인할 수 있어요."
          hint="받아 봅서를 눌러 보세요"
          placement="above"
          align="center"
          hole={claimHole ? () => claimHole : undefined}
          onSkip={() => {
            void saveExploreRewardIntroSeen();
            skipTutorial();
          }}
          interceptBack={false}
          zIndex={100}
        />
      ) : null}

      {exploreEggReveal ? (
        <ExploreEggReward
          eggId={exploreEggReveal.eggId}
          eggCount={exploreEggReveal.eggCount}
          isNewType={exploreEggReveal.isNewType}
          onDone={acknowledgeExploreEggReveal}
        />
      ) : null}
    </View>
  );
}
