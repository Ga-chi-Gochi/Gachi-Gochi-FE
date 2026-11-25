import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

import {
  exploreButtonHole,
  exploreRewardPopupHole,
} from '@/components/island/explore-button-target';
import type { SpotlightHole } from '@/components/guide/guide-spotlight';
import { usePlayState } from '@/components/play-state';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import { useResponsive } from '@/hooks/use-responsive';
import { saveExploreIntroSeen, saveExploreRewardIntroSeen } from '@/lib/explore-intro-state';

export const EXPLORE_TOUR_TOTAL = 8;

const HOME_STEPS = new Set([
  'explore',
  'explore-button',
  'explore-progress',
  'explore-reward',
  'explore-reward-button',
]);

/**
 * 홈: 해금 팝업 → 탐험 버튼 → (모험 보낸 뒤) 진행 중 → 보상 팝업·버튼.
 * 코스·캐릭터·보내기 단계는 /explore 화면에서 이어진다.
 */
export function ExploreUnlockTour({
  enabled = true,
  rewardPopupHole = null,
}: {
  enabled?: boolean;
  /** 홈 위쪽 탐험 완료 팝업 실측 구멍. 없으면 대략 위치로 대체 */
  rewardPopupHole?: SpotlightHole | null;
}) {
  const { scale } = useResponsive();
  const { width, height } = useWindowDimensions();
  const { hasExploreReward } = usePlayState();
  const { step, scope, goTo, skip } = useTutorial();

  // 진행 중 안내를 보는 동안 모험이 끝나면 보상 안내로 이어간다
  useEffect(() => {
    if (!enabled || scope !== 'explore' || step !== 'explore-progress' || !hasExploreReward) {
      return;
    }
    void saveExploreIntroSeen();
    goTo('explore-reward');
  }, [enabled, goTo, hasExploreReward, scope, step]);

  if (!enabled || scope !== 'explore' || !step || !HOME_STEPS.has(step)) {
    return null;
  }

  const dismissIntro = () => {
    void saveExploreIntroSeen();
    skip();
  };

  const dismissReward = () => {
    void saveExploreRewardIntroSeen();
    skip();
  };

  const finishProgress = () => {
    void saveExploreIntroSeen();
    if (hasExploreReward) {
      goTo('explore-reward');
      return;
    }
    skip();
  };

  if (step === 'explore') {
    return (
      <TutorialOverlay
        key="explore-unlock"
        step={1}
        total={EXPLORE_TOUR_TOTAL}
        title="탐험이 열렸수다!"
        body="서쪽 숲으로 고치를 보내 알을 찾을 수 있어요. 코스와 캐릭터를 고르면 모험이 시작돼요."
        placement="center"
        primary={{
          label: '다음',
          onPress: () => goTo('explore-button'),
        }}
        onSkip={dismissIntro}
        zIndex={92}
      />
    );
  }

  const hole = exploreButtonHole(scale, height);

  if (step === 'explore-button') {
    return (
      <TutorialOverlay
        key="explore-button"
        step={2}
        total={EXPLORE_TOUR_TOTAL}
        title="이 버튼으로 모험을 보내 봅서"
        body="탐험을 누르면 코스와 캐릭터를 고르는 화면으로 가요."
        hint="탐험을 눌러 보세요"
        placement="below"
        align="start"
        hole={() => hole}
        onSkip={dismissIntro}
        zIndex={92}
      />
    );
  }

  if (step === 'explore-progress') {
    return (
      <TutorialOverlay
        key="explore-progress"
        step={6}
        total={EXPLORE_TOUR_TOTAL}
        title="모험이 진행 중이에요"
        body="이 버튼이 탐험중으로 바뀌면 고치가 숲에 나가 있는 거예요. 남은 시간도 여기서 볼 수 있어요."
        hint="버튼을 누르거나 다음을 눌러 보세요"
        placement="below"
        align="start"
        hole={() => hole}
        primary={{
          label: '다음',
          onPress: finishProgress,
        }}
        onSkip={dismissIntro}
        zIndex={92}
      />
    );
  }

  if (step === 'explore-reward') {
    return (
      <TutorialOverlay
        key="explore-reward"
        step={7}
        total={EXPLORE_TOUR_TOTAL}
        title="고치가 돌아왔수다!"
        body="고치가 숲에서 무언가를 찾아왔어요. 위쪽 안내에서 받아 봅서."
        placement="center"
        primary={{
          label: '다음',
          onPress: () => goTo('explore-reward-button'),
        }}
        onSkip={dismissReward}
        zIndex={92}
      />
    );
  }

  const rewardHole = rewardPopupHole ?? exploreRewardPopupHole(scale, width);

  return (
    <TutorialOverlay
      key="explore-reward-button"
      step={8}
      total={EXPLORE_TOUR_TOTAL}
      title="받아 봅서!"
      body="위쪽 안내의 받아 봅서를 누르면 고치가 가져온 걸 확인할 수 있어요."
      hint="위쪽 팝업의 받아 봅서를 눌러 보세요"
      placement="below"
      align="center"
      hole={() => rewardHole}
      onSkip={dismissReward}
      zIndex={92}
    />
  );
}
