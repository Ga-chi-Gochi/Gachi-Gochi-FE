import { useCallback, useEffect, useState } from 'react';

import type { WalkingDataSource } from '@/lib/walking-api';

const MOCK_STEP_INCREMENT = 500;
// 걸음 수로 거리를 어림하는 임시 보폭(m).
const STEP_LENGTH_METERS = 0.7;

// [TODO: 실제 연동] 아래 mock 저장소와 readTodaySteps()를 iOS HealthKit / Android Health Connect 호출로 교체한다.
// Expo Go에서는 건강 데이터 네이티브 모듈을 쓸 수 없어서, 지금은 앱이 켜져 있는 동안만 유지되는 가짜 값을 쓴다.
let mockTodaySteps = 0;
// 개발용: 켜 두면 걸음 수 불러오기가 일부러 실패한다. 불러오기 실패 안내를 눌러 보기 위한 것이다.
let mockReadFails = false;

// 오늘 0시부터 지금까지 누적 걸음 수를 읽는다.
async function readTodaySteps(): Promise<number> {
  // [TODO: 실제 연동] 권한 요청 후 오늘 0시 ~ 현재 구간의 걸음 수 합계를 조회한다.
  // - iOS: HealthKit stepCount
  // - Android: Health Connect Steps 레코드
  if (mockReadFails) {
    throw new Error('개발용: 걸음 수 불러오기 실패');
  }
  return mockTodaySteps;
}

// 오늘 걸은 거리(m)를 구한다. 지금은 걸음 수 × 보폭으로 어림한다.
function estimateDistanceMeters(steps: number): number {
  // [TODO: 실제 연동] 어림값 대신 건강 데이터의 실제 이동 거리를 조회한다.
  // - iOS: HealthKit distanceWalkingRunning
  // - Android: Health Connect DistanceRecord
  return Math.round(steps * STEP_LENGTH_METERS);
}

export function useTodaySteps() {
  const [steps, setSteps] = useState(0);
  // [TODO: 실제 연동] 기기 지원 여부와 권한 허용 여부로 판단한다. mock은 항상 읽을 수 있다.
  const [isAvailable] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // 첫 불러오기가 (성공이든 실패든) 끝났는지. 끝나기 전에는 0보를 '기록 없음'으로 보지 않는다.
  const [isLoaded, setIsLoaded] = useState(false);
  const [mockReadFailure, setMockReadFailureState] = useState(mockReadFails);

  // 실패하면 마지막으로 불러온 걸음 수는 그대로 두고 error만 채운다.
  const refresh = useCallback(async () => {
    try {
      setSteps(await readTodaySteps());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 개발 중에만 걸음 수를 늘린다. 배포 빌드에서는 아무 동작도 하지 않는다.
  // [TODO: 실제 연동] 실제 데이터로 바꾼 뒤에는 이 함수와 mock 저장소를 제거한다.
  const addMockSteps = useCallback(() => {
    if (!__DEV__) return;
    mockTodaySteps += MOCK_STEP_INCREMENT;
    refresh();
  }, [refresh]);

  // 개발 중에만 오늘 걸음 수를 0으로 되돌린다.
  // [TODO: 실제 연동] addMockSteps와 함께 제거한다.
  const resetMockSteps = useCallback(() => {
    if (!__DEV__) return;
    mockTodaySteps = 0;
    refresh();
  }, [refresh]);

  // 개발 중에만 '불러오기 실패' 상황을 켜고 끈다. 켜는 순간 바로 다시 불러와서 실패 안내가 보이게 한다.
  // 끌 때는 다시 불러오지 않으므로, 화면의 '다시 시도'를 눌러 복구되는지 확인할 수 있다.
  // [TODO: 실제 연동] addMockSteps와 함께 제거한다.
  const setMockReadFailure = useCallback(
    (fails: boolean) => {
      if (!__DEV__) return;
      mockReadFails = fails;
      setMockReadFailureState(fails);
      if (fails) {
        refresh();
      }
    },
    [refresh],
  );

  const distanceMeters = estimateDistanceMeters(steps);

  // [TODO: 실제 연동] 실제 데이터로 바꾸면 기기에 따라 'healthkit'(iOS) / 'healthconnect'(Android)를 돌려준다.
  const source: WalkingDataSource = 'mock';

  return { steps, distanceMeters, source, isAvailable, isLoaded, error, refresh, addMockSteps, resetMockSteps, mockReadFailure, setMockReadFailure };
}
