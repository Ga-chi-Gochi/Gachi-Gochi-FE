import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { usePlayState } from '@/components/play-state';
import { xpToReachLevel } from '@/constants/growth';
import { TUTORIAL_HATCH_LEVEL, TUTORIAL_REWARD_COINS } from '@/constants/tutorial';
import { hasSeenOnboarding } from '@/lib/onboarding-state';
import {
  hasClaimedTutorialReward,
  markTutorialRewardClaimed,
  readTutorialRecord,
  readTutorialStep,
  saveTutorialStatus,
  saveTutorialStep,
  type TutorialRestStep,
  type TutorialStatus,
} from '@/lib/tutorial-state';

/**
 * 온보딩이 끝난 직후의 튜토리얼 단계.
 * 나침반 → 봉그깅(화면 안내) → 걷기(화면 안내) → 알 부화 선물 → 마무리(귤코인 보상)
 * '-screen' 은 카메라·걷기 화면 안에서 안내를 보는 동안이다.
 */
export type TutorialStep = 'compass' | 'bongging' | 'bongging-screen' | 'walking' | 'walking-screen' | 'gift' | 'finish';

/** full 은 전체 흐름, bongging·walking 은 메뉴에서 고른 기능별 도움말 */
export type TutorialScope = 'full' | 'bongging' | 'walking';

type TutorialScreen = 'bongging' | 'walking';

type TutorialContextValue = {
  /** null 이면 튜토리얼이 진행 중이 아니다 */
  step: TutorialStep | null;
  /** 메뉴에서 다시 보는 중이면 true. 건너뛰기 문구를 가볍게 쓴다 */
  replay: boolean;
  scope: TutorialScope;
  /** 튜토리얼 완료 보상을 이미 받았는지. 받았다면 끝까지 봐도 다시 주지 않는다 */
  rewardClaimed: boolean;
  /** 처음(나침반)부터 시작한다. replay true 면 다시 보기 */
  start: (options?: { replay?: boolean }) => void;
  /** 봉그깅·걷기만 짧게 다시 본다. 보상은 주지 않는다 */
  startHelp: (topic: 'bongging' | 'walking') => void;
  goTo: (step: TutorialStep) => void;
  /** 카메라·걷기 화면 안내를 시작한다 */
  enterScreen: (screen: TutorialScreen) => void;
  /** 카메라·걷기 화면을 떠났을 때(뒤로가기·스와이프 모두) 다음 단계로 넘긴다 */
  leaveScreen: (screen: TutorialScreen) => void;
  /** 알이 깨어나는 만큼 경험치를 선물하고 마무리 단계로 넘어간다 */
  giftXp: () => Promise<void>;
  /** 마무리. 보상을 아직 안 받았다면 귤코인을 주고 튜토리얼을 끝낸다 */
  finish: () => Promise<void>;
  /** 튜토리얼을 닫는다. 전체 흐름이면 건너뛴 것으로 저장한다 */
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
  const [replay, setReplay] = useState(false);
  const [scope, setScope] = useState<TutorialScope>('full');
  const [rewardClaimed, setRewardClaimed] = useState(true);
  // 화면을 떠날 때 부르는 함수는 오래된 렌더의 것일 수 있어서, 최신 값은 ref 로도 들고 있다
  const stepRef = useRef<TutorialStep | null>(null);
  const scopeRef = useRef<TutorialScope>('full');
  const replayRef = useRef(false);
  const claimedRef = useRef(true);

  const move = useCallback((next: TutorialStep | null) => {
    stepRef.current = next;
    setStep(next);
    // 다시 보기·기능별 도움말은 이어하기에 쓰지 않는다. 강제 튜토리얼만 단계를 남긴다
    if (next === null || (!replayRef.current && scopeRef.current === 'full')) {
      void saveTutorialStep(next ? restStep(next) : null);
    }
  }, []);

  // 온보딩은 봤는데 튜토리얼을 마치지 못한 채 앱을 껐다면, 저장된 단계에서 이어 간다
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [seen, record, saved, claimed] = await Promise.all([
          hasSeenOnboarding(),
          readTutorialRecord(),
          readTutorialStep(),
          hasClaimedTutorialReward(),
        ]);
        if (!alive) {
          return;
        }
        claimedRef.current = claimed;
        setRewardClaimed(claimed);
        if (record.status !== null) {
          // 끝냈거나 건너뛴 사용자는 다시 띄우지 않는다. 다시 보기 도중 꺼져서 남은 단계 기록은 지운다
          if (saved) {
            void saveTutorialStep(null);
          }
        } else if (seen) {
          const resume = saved ?? 'compass';
          replayRef.current = false;
          setReplay(false);
          scopeRef.current = 'full';
          setScope('full');
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

  const begin = useCallback(
    (next: TutorialStep, nextScope: TutorialScope, nextReplay: boolean) => {
      replayRef.current = nextReplay;
      setReplay(nextReplay);
      scopeRef.current = nextScope;
      setScope(nextScope);
      stepRef.current = next;
      setStep(next);
      if (!nextReplay && nextScope === 'full') {
        void saveTutorialStep(restStep(next));
      } else {
        void saveTutorialStep(null);
      }
    },
    [],
  );

  const start = useCallback(
    (options?: { replay?: boolean }) => begin('compass', 'full', Boolean(options?.replay)),
    [begin],
  );

  const startHelp = useCallback(
    (topic: 'bongging' | 'walking') => begin(topic, topic, true),
    [begin],
  );

  const goTo = useCallback((next: TutorialStep) => move(next), [move]);
  const enterScreen = useCallback((screen: TutorialScreen) => move(`${screen}-screen`), [move]);

  const clearRun = useCallback(() => {
    replayRef.current = false;
    setReplay(false);
    scopeRef.current = 'full';
    setScope('full');
    move(null);
  }, [move]);

  const leaveScreen = useCallback(
    (screen: TutorialScreen) => {
      if (stepRef.current !== `${screen}-screen`) {
        return;
      }
      // 기능별 도움말은 화면을 나가면 끝난다
      if (scopeRef.current !== 'full') {
        clearRun();
        return;
      }
      move(screen === 'bongging' ? 'walking' : 'gift');
    },
    [clearRun, move],
  );

  const giftXp = useCallback(async () => {
    const needed = xpToReachLevel(TUTORIAL_HATCH_LEVEL, water, xp);
    if (needed > 0) {
      await addXp(needed);
    }
    move('finish');
  }, [addXp, move, water, xp]);

  // 끝냈거나 건너뛴 것을 기억해 두면 다음 실행부터 강제 튜토리얼이 자동으로 뜨지 않는다
  const close = useCallback(
    (status?: TutorialStatus) => {
      clearRun();
      if (status) {
        void saveTutorialStatus(status);
      }
    },
    [clearRun],
  );

  const skip = useCallback(() => {
    // 기능별 도움말은 상태 플래그를 바꾸지 않는다. 전체 흐름만 completed/skipped 를 남긴다
    close(scopeRef.current === 'full' ? 'skipped' : undefined);
  }, [close]);

  const finish = useCallback(async () => {
    if (!claimedRef.current) {
      // 두 번 눌려도 한 번만 주도록 먼저 표시한다
      claimedRef.current = true;
      setRewardClaimed(true);
      addCoins(TUTORIAL_REWARD_COINS);
      await markTutorialRewardClaimed();
    }
    close('completed');
  }, [addCoins, close]);

  const value = useMemo<TutorialContextValue>(
    () => ({
      step,
      replay,
      scope,
      rewardClaimed,
      start,
      startHelp,
      goTo,
      enterScreen,
      leaveScreen,
      giftXp,
      finish,
      skip,
    }),
    [step, replay, scope, rewardClaimed, start, startHelp, goTo, enterScreen, leaveScreen, giftXp, finish, skip],
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
