import { useCallback, useEffect, useState } from 'react';

import { usePlayState } from '@/components/play-state';
import type { WalkingDrops } from '@/constants/walking-reward';
import { sendWalkingRecord, type WalkingDataSource } from '@/lib/walking-api';
import {
  claimWalkingRewards,
  isMockWalkingSaveFailure,
  resetTodayWalkingClaims,
  setMockWalkingSaveFailure,
  todayKey,
} from '@/lib/walking-reward';

type UseWalkingRewardInput = {
  steps: number;
  distanceMeters: number;
  source: WalkingDataSource;
};

// 오늘 걸음 기록을 받아서 걷기 보상을 지급하고, 기기에 저장된 방울 수를 돌려준다.
export function useWalkingReward({ steps, distanceMeters, source }: UseWalkingRewardInput) {
  const { syncWalkingDrops } = usePlayState();
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
        syncWalkingDrops(claim.drops);
        const gained = claim.reward;
        if (!gained) {
          return;
        }
        setReward((current) => (current ? { oxygen: current.oxygen + gained.oxygen, water: current.water + gained.water } : gained));
      })
      .catch(() => setSaveError(true));
  }, [steps, attempt, syncWalkingDrops]);

  // 걸음 기록을 서버로 보낸다. 서버 주소가 없으면 아무것도 보내지 않고, 실패해도 오류를 던지지 않는다.
  // [TODO: 백엔드 연동] 지금은 응답을 쓰지 않고 위의 기기 저장 방식으로만 지급한다.
  // 서버가 생기면 응답의 reward·claimedSteps를 기준으로 삼고, 기기 저장 방식은 서버에 닿지 않을 때만 쓰도록 바꾼다.
  useEffect(() => {
    if (steps <= 0) {
      return;
    }
    void sendWalkingRecord({ date: todayKey(), steps, distanceMeters, source });
  }, [steps, distanceMeters, source]);

  const dismissReward = useCallback(() => setReward(null), []);

  const retrySave = useCallback(() => setAttempt((current) => current + 1), []);

  // 개발용: 오늘 받은 단계 기록만 지운다. 이미 모은 방울 수는 그대로 둔다.
  const resetTodayClaims = useCallback(async () => {
    try {
      const snapshot = await resetTodayWalkingClaims();
      setClaimedSteps(snapshot.claimedSteps);
      setDrops(snapshot.drops);
      syncWalkingDrops(snapshot.drops);
      setReward(null);
      return true;
    } catch {
      setSaveError(true);
      return false;
    }
  }, [syncWalkingDrops]);

  // 개발 중에만 '저장 실패' 상황을 켜고 끈다.
  const setMockSaveFailure = useCallback((fails: boolean) => {
    if (!__DEV__) return;
    setMockWalkingSaveFailure(fails);
    setMockSaveFailureState(fails);
  }, []);

  return { claimedSteps, drops, reward, saveError, dismissReward, retrySave, resetTodayClaims, mockSaveFailure, setMockSaveFailure };
}
