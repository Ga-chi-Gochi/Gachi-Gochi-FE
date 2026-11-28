import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePlayState } from '@/components/play-state';
import type { WalkingRewardGain } from '@/constants/walking-reward';
import { sendWalkingRecord, type WalkingDataSource } from '@/lib/walking-api';
import {
  claimWalkingRewards,
  isMockWalkingSaveFailure,
  pendingWalkingTiers,
  readWalkingClaims,
  resetTodayWalkingClaims,
  setMockWalkingSaveFailure,
  todayKey,
} from '@/lib/walking-reward';

type UseWalkingRewardInput = {
  steps: number;
  distanceMeters: number;
  source: WalkingDataSource;
};

export type WalkingRewardEvent = WalkingRewardGain & { fromXp: number };

export function useWalkingReward({ steps, distanceMeters, source }: UseWalkingRewardInput) {
  const { addCoins, addXp, xp } = usePlayState();
  const grantRef = useRef({ addCoins, addXp, xp });
  const claimingRef = useRef(false);
  // 오늘 이미 보상을 받은 단계의 걸음 수 기준값.
  const [claimedSteps, setClaimedSteps] = useState<number[]>([]);
  // 방금 새로 지급되어 아직 팝업이나 빵빠레로 확인하지 않은 보상.
  const [reward, setReward] = useState<WalkingRewardEvent | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [mockSaveFailure, setMockSaveFailureState] = useState(isMockWalkingSaveFailure);

  useEffect(() => {
    grantRef.current = { addCoins, addXp, xp };
  }, [addCoins, addXp, xp]);

  useEffect(() => {
    let cancelled = false;
    readWalkingClaims()
      .then((snapshot) => {
        if (!cancelled) {
          setClaimedSteps(snapshot.claimedSteps);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [steps]);

  const pendingSteps = useMemo(() => pendingWalkingTiers(steps, claimedSteps).map((tier) => tier.steps), [steps, claimedSteps]);

  const claim = useCallback(async () => {
    if (claimingRef.current) {
      return;
    }
    claimingRef.current = true;
    setClaiming(true);
    try {
      const result = await claimWalkingRewards(steps);
      setSaveError(false);
      setClaimedSteps(result.claimedSteps);
      const gained = result.reward;
      if (!gained) {
        return;
      }
      const fromXp = grantRef.current.xp;
      grantRef.current.addCoins(gained.coins);
      void grantRef.current.addXp(gained.xp);
      setReward({ ...gained, fromXp });
    } catch {
      setSaveError(true);
    } finally {
      claimingRef.current = false;
      setClaiming(false);
    }
  }, [steps]);

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

  // 개발용: 오늘 받은 단계 기록만 지운다.
  const resetTodayClaims = useCallback(async () => {
    try {
      const snapshot = await resetTodayWalkingClaims();
      setClaimedSteps(snapshot.claimedSteps);
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

  return {
    claimedSteps,
    pendingSteps,
    claim,
    claiming,
    reward,
    saveError,
    dismissReward,
    retrySave: claim,
    resetTodayClaims,
    mockSaveFailure,
    setMockSaveFailure,
  };
}
