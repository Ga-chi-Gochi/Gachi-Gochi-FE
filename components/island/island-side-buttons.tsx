import { useEffect, useRef } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVolcanoEruption } from '@/components/island/volcano-eruption';
import { PixelButton } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { useResponsive } from '@/hooks/use-responsive';

type IslandSideButtonsProps = {
  /** 화산재가 아래를 덮은 정도 (0~1). 버튼 투명도에 씀 */
  ashBottom?: number;
};

async function confirmReset(resetLocalData: () => Promise<void>) {
  const message = '이 기기에 저장된 섬·경험치·걷기 기록을 모두 지울까요?';
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(message)) {
      await resetLocalData();
      window.alert('로컬 데이터를 초기화했어요.');
    }
    return;
  }
  Alert.alert('데이터 초기화', message, [
    { text: '취소', style: 'cancel' },
    {
      text: '초기화',
      style: 'destructive',
      onPress: () => {
        void (async () => {
          await resetLocalData();
          Alert.alert('완료', '로컬 데이터를 초기화했어요.');
        })();
      },
    },
  ]);
}

/** 섬 왼쪽 아래 개발·성장 버튼. HUD 레이어에 올려 터치가 먹히게 한다. */
export function IslandSideButtons({ ashBottom = 0 }: IslandSideButtonsProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const { growCreature, resetLocalData, homeExpandSignal, releaseIslandExpandAttempt, growLocked } = usePlayState();
  const { erupt } = useVolcanoEruption();
  const lastExpandSignal = useRef(homeExpandSignal);

  // XP 임계 → 예전「섬 넓히기」와 동일하게 erupt 만 호출 (해금은 게임 reveal)
  useEffect(() => {
    if (homeExpandSignal === lastExpandSignal.current) {
      return;
    }
    lastExpandSignal.current = homeExpandSignal;
    if (homeExpandSignal <= 0) {
      return;
    }
    if (!erupt()) {
      releaseIslandExpandAttempt();
    }
  }, [erupt, homeExpandSignal, releaseIslandExpandAttempt]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: scale(12),
        bottom: insets.bottom + scale(12),
        width: scale(148),
        gap: scale(8),
        zIndex: 45,
        opacity: 1 - ashBottom,
      }}>
      <PixelButton label="로컬 데이터 초기화" tone="ghost" onPress={() => void confirmReset(resetLocalData)} />
      <PixelButton label="키우기" tone="green" disabled={growLocked} onPress={() => void growCreature()} />
    </View>
  );
}
