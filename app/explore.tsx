import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ExploreEggReward } from '@/components/island/explore-egg-reward';
import { ExploreWaitingAnim } from '@/components/island/explore-waiting-anim';
import { PixelButton, PixelChip, PixelPanel, PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { usePlayState } from '@/components/play-state';
import { EXPLORE_MOCK_GOCHIS, getExploreGochi } from '@/constants/explore';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

/**
 * 고치 탐험 보내기 — 다마고치형 하루 루틴.
 * 파견 → 타이머 → 완료 수령 → 고치 알 연출.
 */
export default function ExploreScreen() {
  const { scale } = useResponsive();
  const {
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
    exploreEggCount,
    exploreEggReveal,
    startExplore,
    claimExploreEgg,
    acknowledgeExploreEggReveal,
    syncExplore,
  } = usePlayState();

  const [selectedGochiId, setSelectedGochiId] = useState(EXPLORE_MOCK_GOCHIS[0]?.id ?? 'sprout');
  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void syncExplore();
    }, [syncExplore]),
  );

  const activeGochi = useMemo(() => {
    const id = isExploring
      ? exploringGochiId
      : hasExploreReward
        ? pendingExploreGochiId
        : selectedGochiId;
    return getExploreGochi(id) ?? EXPLORE_MOCK_GOCHIS[0];
  }, [exploringGochiId, hasExploreReward, isExploring, pendingExploreGochiId, selectedGochiId]);

  const statusLabel = !exploreForestUnlocked
    ? '서쪽 숲을 먼저 열어주세요'
    : hasExploreReward
      ? '탐험 완료! 보상을 받아 주세요'
      : isExploring
        ? `${activeGochi?.name ?? '고치'}가 숲을 탐험 중이에요`
        : exploreRemaining <= 0
          ? '오늘 탐험은 모두 끝났어요'
          : '보낼 고치를 골라 주세요';

  const onDispatch = async () => {
    if (!canStartExplore || sending || !selectedGochiId) {
      return;
    }
    setSending(true);
    try {
      await startExplore({ gochiId: selectedGochiId });
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

  return (
    <PixelScreen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: scale(16),
          paddingTop: scale(8),
          paddingBottom: scale(20),
          gap: scale(12),
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={{
              paddingHorizontal: scale(12),
              paddingVertical: scale(8),
              borderWidth: scale(2),
              borderColor: pixel.ink,
              backgroundColor: pixel.white,
            }}>
            <PixelText size={12}>← 섬으로</PixelText>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: scale(6) }}>
            <PixelChip label={`알 ${exploreEggCount}`} bg={pixel.sand} />
            <PixelChip
              label={`오늘 ${exploreRemaining}/${exploreDailyLimit}`}
              bg={exploreRemaining > 0 ? pixel.grass : pixel.ash}
            />
          </View>
        </View>

        <PixelText size={20} center>
          숲 탐험
        </PixelText>
        <PixelText size={12} color={pixel.muted} center>
          섬의 서쪽 숲으로 고치를 보내요.{'\n'}돌아오면 알을 발견할지도 몰라요.
        </PixelText>

        <View style={{ alignItems: 'center', gap: scale(12) }}>
          {isExploring ? (
            <ExploreWaitingAnim gochiId={exploringGochiId} variant="full" />
          ) : (
            <View
              style={{
                width: scale(180),
                height: scale(180),
                borderWidth: scale(pixel.border),
                borderColor: pixel.ink,
                backgroundColor: hasExploreReward ? pixel.sand : pixel.grass,
                alignItems: 'center',
                justifyContent: 'center',
                gap: scale(8),
              }}>
              <PixelSprite id="tree" size={scale(64)} />
              <PixelSprite id={hasExploreReward ? 'egg' : (activeGochi?.sprite ?? 'sprout')} size={scale(44)} />
            </View>
          )}

          <PixelPanel style={{ width: '100%', alignItems: 'center', gap: scale(8) }}>
            <PixelText size={13} center>
              {statusLabel}
            </PixelText>
            {isExploring ? (
              <>
                <PixelText size={28} center color={pixel.grassDeep}>
                  {exploreRemainLabel}
                </PixelText>
                <View
                  style={{
                    width: '100%',
                    height: scale(14),
                    borderWidth: scale(2),
                    borderColor: pixel.ink,
                    backgroundColor: pixel.white,
                    overflow: 'hidden',
                  }}>
                  <View
                    style={{
                      width: `${Math.round(Math.min(1, Math.max(0, exploreProgress)) * 100)}%`,
                      height: '100%',
                      backgroundColor: pixel.leaf,
                    }}
                  />
                </View>
                <PixelText size={11} color={pixel.muted} center>
                  {activeGochi?.name}가 풀숲을 뒤지는 중 · {Math.round(exploreProgress * 100)}%
                </PixelText>
              </>
            ) : hasExploreReward ? (
              <PixelText size={11} color={pixel.muted} center>
                {activeGochi?.name ?? '고치'}가 고치 알을 들고 돌아왔어요
              </PixelText>
            ) : (
              <PixelText size={11} color={pixel.muted} center>
                탐험은 약 3초 · 하루 {exploreDailyLimit}번
              </PixelText>
            )}
          </PixelPanel>
        </View>

        {!isExploring && !hasExploreReward ? (
          <>
            <PixelText size={14}>보낼 고치</PixelText>
            <View style={{ gap: scale(8) }}>
              {EXPLORE_MOCK_GOCHIS.map((gochi) => {
                const selected = selectedGochiId === gochi.id;
                return (
                  <Pressable
                    key={gochi.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={!exploreForestUnlocked || exploreRemaining <= 0}
                    onPress={() => setSelectedGochiId(gochi.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: scale(10),
                      padding: scale(10),
                      borderWidth: scale(2),
                      borderColor: pixel.ink,
                      backgroundColor: selected ? pixel.sand : pixel.white,
                      opacity: !exploreForestUnlocked || exploreRemaining <= 0 ? 0.5 : 1,
                    }}>
                    <PixelSprite id={gochi.sprite} size={scale(36)} />
                    <View style={{ flex: 1, gap: scale(2) }}>
                      <PixelText size={13}>{gochi.name}</PixelText>
                      <PixelText size={11} color={pixel.muted}>
                        {gochi.detail}
                      </PixelText>
                    </View>
                    {selected ? <PixelChip label="선택" bg={pixel.leaf} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {hasExploreReward ? (
          <PixelButton
            label={claiming ? '받는 중…' : '탐험 완료! 보상 받기'}
            tone="orange"
            disabled={claiming}
            onPress={() => {
              void onClaim();
            }}
          />
        ) : (
          <PixelButton
            label={
              sending
                ? '보내는 중…'
                : isExploring
                  ? '탐험 중…'
                  : canStartExplore
                    ? '고치 탐험 보내기'
                    : '지금은 보낼 수 없어요'
            }
            tone="green"
            disabled={!canStartExplore || sending}
            onPress={() => {
              void onDispatch();
            }}
          />
        )}
        {!exploreForestUnlocked ? (
          <PixelText size={11} color={pixel.muted} center>
            섬 넓히기로 서쪽 숲을 열면 탐험할 수 있어요
          </PixelText>
        ) : null}
      </ScrollView>

      {exploreEggReveal ? (
        <ExploreEggReward
          eggId={exploreEggReveal.eggId}
          eggCount={exploreEggReveal.eggCount}
          isNewType={exploreEggReveal.isNewType}
          onDone={acknowledgeExploreEggReveal}
        />
      ) : null}
    </PixelScreen>
  );
}
