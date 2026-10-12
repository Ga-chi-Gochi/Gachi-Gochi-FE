import { useCallback, useEffect, useState } from 'react';

import type { WalkingDrops } from '@/constants/walking-reward';
import {
  applyWalkingRewardToGrowth,
  claimWalkingRewards,
  isMockWalkingSaveFailure,
  resetTodayWalkingClaims,
  setMockWalkingSaveFailure,
} from '@/lib/walking-reward';

// 오늘 걸음 수를 받아서 걷기 보상을 지급하고, 기기에 저장된 방울 수를 돌려준다.
export function useWalkingReward(steps: number) {
  // 오늘 이미 보상을 받은 단계의 걸음 수 기준값.
  const [claimedSteps, setClaimedSteps] = useState<number[]>([]);
  // 지금까지 모은 방울 수.
  const [drops, setDrops] = useState<WalkingDrops>({ oxygen: 0, water: 0 });
  // 방금 새로 지급되어 아직 팝업으로 확인하지 않은 보상.
  const [reward, setReward] = useState<WalkingDrops | null>(null);
  // 방울 기록을 읽거나 저장하다 실패했는지. 실패한 보상은 지급되지 않은 채로 남아서, 다시 시도하면 받을 수 있다.
  const [saveError, setSaveError] = useState(false);
  // 값을 바꾸면 같은 걸음 수로 지급을 다시 시도한다.
  const [attempt, setAttempt] = useState(0);
  const [mockSaveFailure, setMockSaveFailureState] = useState(isMockWalkingSaveFailure);

  // 걸음 수가 바뀔 때마다 새로 달성한 단계가 있는지 확인하고, 있으면 자동으로 지급한다.
  // 새로 달성한 단계가 없어도 저장된 기록(받은 단계, 방울 수)을 불러온다.
  useEffect(() => {
    claimWalkingRewards(steps)
      .then((claim) => {
        setSaveError(false);
        setClaimedSteps(claim.claimedSteps);
        setDrops(claim.drops);
        const gained = claim.reward;
        if (!gained) {
          return;
        }
        applyWalkingRewardToGrowth(gained);
        setReward((current) => (current ? { oxygen: current.oxygen + gained.oxygen, water: current.water + gained.water } : gained));
      })
      .catch(() => setSaveError(true));
  }, [steps, attempt]);

  const dismissReward = useCallback(() => setReward(null), []);

  const retrySave = useCallback(() => setAttempt((current) => current + 1), []);

  // 개발용: 오늘 받은 단계 기록만 지운다. 이미 모은 방울 수는 그대로 둔다.
  const resetTodayClaims = useCallback(async () => {
    try {
      const snapshot = await resetTodayWalkingClaims();
      setClaimedSteps(snapshot.claimedSteps);
      setDrops(snapshot.drops);
      setReward(null);
      return true;
    } catch {
      setSaveError(true);
      return false;
    }
  }, []);

  // 개발 중에만 '저장 실패' 상황을 켜고 끈다.
  const setMockSaveFailure = useCallback((fails: boolean) => {
    if (!__DEV__) return;
    setMockWalkingSaveFailure(fails);
    setMockSaveFailureState(fails);
  }, []);

  return { claimedSteps, drops, reward, saveError, dismissReward, retrySave, resetTodayClaims, mockSaveFailure, setMockSaveFailure };
}
