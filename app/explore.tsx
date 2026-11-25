import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { GachiButton, GachiIconButton } from '@/components/gachi-ui/gachi-button';
import { GachiCoinBadge } from '@/components/gachi-ui/gachi-hud';
import { ExploreEggReward } from '@/components/island/explore-egg-reward';
import { ExploreWaitingAnim } from '@/components/island/explore-waiting-anim';
import { usePlayState } from '@/components/play-state';
import {
  canSendExploreCharacter,
  EXPLORE_CHARACTERS,
  EXPLORE_COURSES,
  formatExploreReturnLabel,
  getExploreCharacter,
  getExploreCourse,
  getExploreGochi,
  type ExploreCharacterId,
  type ExploreCourseId,
} from '@/constants/explore';
import { gachiUi } from '@/constants/gachi-ui';
import { ISLAND_HOME } from '@/constants/routes';
import { uiButtons } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';

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
    exploreRemainLabel,
    exploreProgress,
    exploringGochiId,
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
  /** 파견 성공 직후 isExploring 으로 상태 화면이 한 프레임 뜨는 것 방지 */
  const [suppressStatus, setSuppressStatus] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void syncExplore();
    }, [syncExplore]),
  );

  const selectedCourse = useMemo(
    () => getExploreCourse(selectedCourseId),
    [selectedCourseId],
  );

  const selectedCharacter = useMemo(
    () => getExploreCharacter(selectedCharacterId),
    [selectedCharacterId],
  );

  const activeName = useMemo(() => {
    const id = isExploring
      ? exploringGochiId
      : hasExploreReward
        ? pendingExploreGochiId
        : selectedCharacterId;
    return getExploreGochi(id)?.name ?? getExploreCharacter(id as ExploreCharacterId)?.name ?? '귤새';
  }, [
    exploringGochiId,
    hasExploreReward,
    isExploring,
    pendingExploreGochiId,
    selectedCharacterId,
  ]);

  const pickDefaultCharacter = useCallback(
    (courseId: ExploreCourseId) => {
      const course = getExploreCourse(courseId);
      if (!course) {
        return;
      }
      const eligible = EXPLORE_CHARACTERS.filter((entry) =>
        canSendExploreCharacter(entry, growthStage.level, course.hours),
      );
      const preferred =
        eligible.find((entry) => entry.id === 'adult') ??
        eligible.find((entry) => entry.id === 'young') ??
        null;
      setSelectedCharacterId(preferred?.id ?? null);
    },
    [growthStage.level],
  );

  const onSelectCourse = (courseId: ExploreCourseId) => {
    if (!exploreForestUnlocked || exploreRemaining <= 0 || isExploring || hasExploreReward) {
      return;
    }
    setSelectedCourseId(courseId);
    pickDefaultCharacter(courseId);
    setStep('character');
  };

  const onBack = () => {
    if (step === 'character' && !isExploring && !hasExploreReward) {
      setStep('course');
      return;
    }
    leaveExplore();
  };

  const canDispatch =
    canStartExplore &&
    !!selectedCourse &&
    !!selectedCharacter &&
    canSendExploreCharacter(selectedCharacter, growthStage.level, selectedCourse.hours);

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
      await claimExploreEgg();
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

      {(isExploring || hasExploreReward) && !suppressStatus ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: padX,
            paddingTop: scale(12),
            paddingBottom: Math.max(insets.bottom, scale(20)) + scale(12),
            gap: scale(14),
            alignItems: 'center',
          }}>
          <ExploreWaitingAnim gochiId={exploringGochiId ?? pendingExploreGochiId} variant="full" />
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
              {hasExploreReward
                ? '모험 완료! 보상을 받아 주세요'
                : `${activeName}가 모험 중이에요`}
            </GalmuriText>
            {isExploring ? (
              <>
                <GalmuriText size={20} bold color={gachiUi.greenDeep} center>
                  {exploreRemainLabel}
                </GalmuriText>
                <View
                  style={{
                    width: '100%',
                    height: scale(12),
                    borderWidth: border,
                    borderColor: gachiUi.ink,
                    backgroundColor: gachiUi.white,
                    overflow: 'hidden',
                    borderRadius: scale(4),
                  }}>
                  <View
                    style={{
                      width: `${Math.round(Math.min(1, Math.max(0, exploreProgress)) * 100)}%`,
                      height: '100%',
                      backgroundColor: gachiUi.green,
                    }}
                  />
                </View>
              </>
            ) : (
              <GalmuriText size={9} color={gachiUi.inkSoft} center>
                {activeName}가 고치 알을 들고 돌아왔어요
              </GalmuriText>
            )}
          </View>
          {hasExploreReward ? (
            <GachiButton
              label={claiming ? '받는 중…' : '보상 받기'}
              tone="green"
              width="wide"
              disabled={claiming}
              onPress={() => {
                void onClaim();
              }}
            />
          ) : null}
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
                  어디로 어떤 캐릭터를 보내느냐에 따라 결과가 달라져요
                </GalmuriText>
              </View>

              <View style={{ flexDirection: 'row', gap: scale(8) }}>
                {EXPLORE_CHARACTERS.filter((character) => character.id !== 'egg').map((character) => {
                  const unlocked = selectedCourse
                    ? canSendExploreCharacter(character, growthStage.level, selectedCourse.hours)
                    : false;
                  const selected = selectedCharacterId === character.id;
                  return (
                    <Pressable
                      key={character.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: !unlocked }}
                      disabled={!unlocked}
                      onPress={() => setSelectedCharacterId(character.id)}
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
                        {character.detail}
                      </GalmuriText>
                    </Pressable>
                  );
                })}
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
                {!canDispatch && exploreForestUnlocked ? (
                  <GalmuriText size={8} color={gachiUi.inkSoft} center style={{ marginTop: scale(8) }}>
                    {exploreRemaining <= 0
                      ? '오늘 모험은 모두 끝났어요'
                      : !selectedCharacter
                        ? '이 코스에 보낼 수 있는 캐릭터가 없어요'
                        : '보낼 캐릭터를 골라 주세요'}
                  </GalmuriText>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
      )}

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
