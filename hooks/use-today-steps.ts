import { useCallback, useEffect, useState } from 'react';

const MOCK_STEP_INCREMENT = 500;

// [TODO: 실제 연동] 아래 mock 저장소와 readTodaySteps()를 iOS HealthKit / Android Health Connect 호출로 교체한다.
// Expo Go에서는 건강 데이터 네이티브 모듈을 쓸 수 없어서, 지금은 앱이 켜져 있는 동안만 유지되는 가짜 값을 쓴다.
let mockTodaySteps = 0;

// 오늘 0시부터 지금까지 누적 걸음 수를 읽는다.
async function readTodaySteps(): Promise<number> {
  // [TODO: 실제 연동] 권한 요청 후 오늘 0시 ~ 현재 구간의 걸음 수 합계를 조회한다.
  // - iOS: HealthKit stepCount
  // - Android: Health Connect Steps 레코드
  return mockTodaySteps;
}

export function useTodaySteps() {
  const [steps, setSteps] = useState(0);
  // [TODO: 실제 연동] 기기 지원 여부와 권한 허용 여부로 판단한다. mock은 항상 읽을 수 있다.
  const [isAvailable] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSteps(await readTodaySteps());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
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

  return { steps, isAvailable, error, refresh, addMockSteps };
}
