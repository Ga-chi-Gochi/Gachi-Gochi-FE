import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { usePlayState } from '@/components/play-state';
import { TUTORIAL_HATCH_LEVEL, TUTORIAL_REWARD_COINS } from '@/constants/tutorial';
import { xpToReachLevel } from '@/constants/growth';
import {
  hasClaimedTutorialReward,
  hasSeenActivityTour,
  hasSeenOnboarding,
  markActivityTourSeen,
  markTutorialRewardClaimed,
  readTutorialStep,
  saveTutorialStep,
  type TutorialRestStep,
} from '@/lib/onboarding-state';

/**
 * 온보딩이 끝난 직후의 튜토리얼 단계.
 * 나침반 → 봉그깅(화면 안내) → 걷기(화면 안내) → 알 부화 선물 → 마무리(귤코인 보상)
 * '-screen' 은 카메라·걷기 화면 안에서 안내를 보는 동안이다.
 */
export type TutorialStep = 'compass' | 'bongging' | 'bongging-screen' | 'walking' | 'walking-screen' | 'gift' | 'finish';

type TutorialScreen = 'bongging' | 'walking';

type TutorialContextValue = {
  /** null 이면 튜토리얼이 진행 중이 아니다 */
  step: TutorialStep | null;
  /** 튜토리얼 완료 보상을 이미 받았는지. 받았다면 끝까지 봐도 다시 주지 않는다 */
  rewardClaimed: boolean;
  /** 처음(나침반)부터 시작한다. 가이드 다시 보기에도 쓴다 */
  start: () => void;
  goTo: (step: TutorialStep) => void;
  /** 카메라·걷기 화면 안내를 시작한다 */
  enterScreen: (screen: TutorialScreen) => void;
  /** 카메라·걷기 화면을 떠났을 때(뒤로가기·스와이프 모두) 다음 단계로 넘긴다 */
  leaveScreen: (screen: TutorialScreen) => void;
  /** 알이 깨어나는 만큼 경험치를 선물하고 마무리 단계로 넘어간다 */
  giftXp: () => Promise<void>;
  /** 마무리. 보상을 아직 안 받았다면 귤코인을 주고 튜토리얼을 끝낸다 */
  finish: () => Promise<void>;
  /** 보상 없이 튜토리얼을 닫는다 */
  skip: () => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

/** 앱을 껐다 켰을 때 되돌아갈 단계. 화면 안 단계는 그 화면을 누르기 전 단계로 돌린다 */
function restStep(step: TutorialStep): TutorialRestStep {
  if (step === 'bongging-screen') return 'bongging';
  if (step === 'walking-screen') return 'walking';
  return step;
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { water, xp, addXp, addCoins } = usePlayState();
  const [step, setStep] = useState<TutorialStep | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(true);
  // 화면을 떠날 때 부르는 함수는 오래된 렌더의 것일 수 있어서, 최신 단계는 ref 로도 들고 있다
  const stepRef = useRef<TutorialStep | null>(null);
  const claimedRef = useRef(true);

  const move = useCallback((next: TutorialStep | null) => {
    stepRef.current = next;
    setStep(next);
    void saveTutorialStep(next ? restStep(next) : null).catch(() => undefined);
  }, []);

  // 온보딩은 봤는데 튜토리얼을 마치지 못한 채 앱을 껐다면, 저장된 단계에서 이어 간다
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [seen, done, saved, claimed] = await Promise.all([
          hasSeenOnboarding(),
          hasSeenActivityTour(),
          readTutorialStep(),
          hasClaimedTutorialReward(),
        ]);
        if (!alive) {
          return;
        }
        claimedRef.current = claimed;
        setRewardClaimed(claimed);
        if (seen && !done) {
          const resume = saved ?? 'compass';
          stepRef.current = resume;
          setStep(resume);
        }
      } catch {
        // 저장소를 읽지 못하면 튜토리얼을 띄우지 않는다
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const start = useCallback(() => move('compass'), [move]);
  const goTo = useCallback((next: TutorialStep) => move(next), [move]);
  const enterScreen = useCallback((screen: TutorialScreen) => move(`${screen}-screen`), [move]);

  const leaveScreen = useCallback(
    (screen: TutorialScreen) => {
      if (stepRef.current !== `${screen}-screen`) {
        return;
      }
      move(screen === 'bongging' ? 'walking' : 'gift');
    },
    [move],
  );

  const giftXp = useCallback(async () => {
    const needed = xpToReachLevel(TUTORIAL_HATCH_LEVEL, water, xp);
    if (needed > 0) {
      await addXp(needed);
    }
    move('finish');
  }, [addXp, move, water, xp]);

  const skip = useCallback(() => {
    move(null);
    void markActivityTourSeen().catch(() => undefined);
  }, [move]);

  const finish = useCallback(async () => {
    if (!claimedRef.current) {
      // 두 번 눌려도 한 번만 주도록 먼저 표시한다
      claimedRef.current = true;
      setRewardClaimed(true);
      addCoins(TUTORIAL_REWARD_COINS);
      await markTutorialRewardClaimed().catch(() => undefined);
    }
    skip();
  }, [addCoins, skip]);

  const value = useMemo<TutorialContextValue>(
    () => ({ step, rewardClaimed, start, goTo, enterScreen, leaveScreen, giftXp, finish, skip }),
    [step, rewardClaimed, start, goTo, enterScreen, leaveScreen, giftXp, finish, skip],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial 은 TutorialProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}
