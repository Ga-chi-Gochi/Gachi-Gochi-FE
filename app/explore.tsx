import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PixelButton, PixelChip, PixelPanel, PixelScreen, PixelText } from '@/components/pixel/pixel-ui';
import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { usePlayState } from '@/components/play-state';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

/**
 * 고치 탐험 보내기 — 다마고치형 하루 루틴.
 * 서쪽 숲이 열린 섬에서 고치를 보내 두고, 타이머가 끝나면 알/보상을 받는다 (보상은 이후 단계).
 */
export default function ExploreScreen() {
  const { scale } = useResponsive();
  const {
    exploreForestUnlocked,
    exploreRemaining,
    exploreDailyLimit,
    isExploring,
    canStartExplore,
    exploreRemainLabel,
    startExplore,
  } = usePlayState();

  const statusLabel = !exploreForestUnlocked
    ? '서쪽 숲을 먼저 열어주세요'
    : isExploring
      ? '고치가 숲을 탐험 중이에요'
      : exploreRemaining <= 0
        ? '오늘 탐험은 모두 끝났어요'
        : '고치를 숲으로 보낼 수 있어요';

  return (
    <PixelScreen>
      <View style={{ flex: 1, paddingHorizontal: scale(16), paddingTop: scale(8), gap: scale(12) }}>
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
          <PixelChip
            label={`오늘 ${exploreRemaining}/${exploreDailyLimit}`}
            bg={exploreRemaining > 0 ? pixel.grass : pixel.ash}
          />
        </View>

        <PixelText size={20} center>
          숲 탐험
        </PixelText>
        <PixelText size={12} color={pixel.muted} center>
          섬의 서쪽 숲으로 고치를 보내요.{'\n'}돌아오면 알을 발견할지도 몰라요.
        </PixelText>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(16) }}>
          <View
            style={{
              width: scale(200),
              height: scale(200),
              borderWidth: scale(pixel.border),
              borderColor: pixel.ink,
              backgroundColor: pixel.grass,
              alignItems: 'center',
              justifyContent: 'center',
              gap: scale(8),
            }}>
            <PixelSprite id="tree" size={scale(72)} />
            <PixelSprite id={isExploring ? 'buddy' : 'sprout'} size={scale(48)} />
          </View>

          <PixelPanel style={{ width: '100%', maxWidth: scale(320), alignItems: 'center', gap: scale(6) }}>
            <PixelText size={13} center>
              {statusLabel}
            </PixelText>
            {isExploring ? (
              <>
                <PixelText size={28} center color={pixel.grassDeep}>
                  {exploreRemainLabel}
                </PixelText>
                <PixelText size={11} color={pixel.muted} center>
                  남은 시간
                </PixelText>
              </>
            ) : (
              <PixelText size={11} color={pixel.muted} center>
                탐험은 약 3초 · 하루 {exploreDailyLimit}번
              </PixelText>
            )}
          </PixelPanel>
        </View>

        <View style={{ paddingBottom: scale(16), gap: scale(8) }}>
          <PixelButton
            label={isExploring ? '탐험 중…' : canStartExplore ? '고치 탐험 보내기' : '지금은 보낼 수 없어요'}
            tone="green"
            disabled={!canStartExplore}
            onPress={() => {
              void startExplore();
            }}
          />
          {!exploreForestUnlocked ? (
            <PixelText size={11} color={pixel.muted} center>
              섬 넓히기로 서쪽 숲을 열면 탐험할 수 있어요
            </PixelText>
          ) : null}
        </View>
      </View>
    </PixelScreen>
  );
}
