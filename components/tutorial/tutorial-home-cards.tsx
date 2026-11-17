import { useState } from 'react';

import { usePlayState } from '@/components/play-state';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import { TUTORIAL_HATCH_LEVEL, TUTORIAL_REWARD_COINS } from '@/constants/tutorial';

/**
 * 튜토리얼의 마지막 두 장. 구멍 없이 화면 가운데에 카드만 띄운다.
 * 1) 알 부화 선물: 인증하면 이렇게 경험치를 얻는다고 알려 주고, 알이 깨어나는 만큼 경험치를 대신 준다.
 * 2) 마무리: 튜토리얼 보상으로 귤코인을 준다.
 */
export function TutorialHomeCards({ enabled = true }: { enabled?: boolean }) {
  const { step, rewardClaimed, giftXp, finish, skip } = useTutorial();
  const { growthStage, growthReveal } = usePlayState();
  const [busy, setBusy] = useState(false);

  // 알이 깨어나는 연출이 도는 동안에는 카드를 잠시 숨긴다
  if (!enabled || growthReveal || (step !== 'gift' && step !== 'finish')) {
    return null;
  }

  // 이미 알이 깨어난 상태라면 선물할 게 없으니 곧장 마무리 카드를 보여 준다
  const hatched = growthStage.level >= TUTORIAL_HATCH_LEVEL;
  const showFinish = step === 'finish' || hatched;

  const run = (task: () => Promise<void>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    void task().finally(() => setBusy(false));
  };

  if (showFinish) {
    return (
      <TutorialOverlay
        key="finish"
        step={5}
        title="이제 마음껏 키워 보세요"
        body={
          rewardClaimed
            ? '인증하고 걸으면서 경험치를 모으면 고치가 쑥쑥 자라요. 메뉴에서 언제든 다시 볼 수 있어요.'
            : `인증하고 걸으면서 경험치를 모으면 고치가 쑥쑥 자라요. 튜토리얼 보상으로 귤 ${TUTORIAL_REWARD_COINS}개를 드려요!`
        }
        placement="center"
        primary={{
          label: rewardClaimed ? '시작하기' : `귤 ${TUTORIAL_REWARD_COINS}개 받고 시작하기`,
          disabled: busy,
          onPress: () => run(finish),
        }}
        onSkip={skip}
        zIndex={90}
      />
    );
  }

  return (
    <TutorialOverlay
      key="gift"
      step={4}
      title="알은 제가 깨워 드릴게요"
      body="인증하거나 걸으면 이렇게 경험치를 얻어 고치가 자라요. 지금은 경험치를 선물로 드릴게요!"
      placement="center"
      primary={{ label: '경험치 받기', disabled: busy, onPress: () => run(giftXp) }}
      onSkip={skip}
      zIndex={90}
    />
  );
}
