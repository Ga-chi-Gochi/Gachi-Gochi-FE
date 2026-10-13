import { useCallback, useEffect, useState } from 'react';

import { clearWalkingConsent, hasWalkingConsent, saveWalkingConsent } from '@/lib/walking-consent';

export type HealthPermission = 'granted' | 'denied';

// checking: 확인 중 / ready: 걸음을 불러와도 됨 / needs-consent: 개인정보 수집 동의가 필요함
export type HealthAccessStatus = 'checking' | 'ready' | 'needs-consent';

// [TODO: 실제 연동] 아래 mock 값과 readHealthPermission()을 실제 건강 앱 권한 조회로 교체한다.
// 지금은 실제 권한을 물을 수 없어서, 앱이 켜져 있는 동안만 유지되는 가짜 값을 쓴다.
let mockHealthPermission: HealthPermission = 'granted';

// '건강 앱 접근 허용' 여부를 돌려준다. 권한 결과는 이 함수 한 곳에서만 나온다.
async function readHealthPermission(): Promise<HealthPermission> {
  // [TODO: 실제 연동] 권한을 요청하고 결과를 돌려준다.
  // - iOS: HealthKit 읽기 권한 (stepCount, distanceWalkingRunning)
  // - Android: Health Connect 권한 (Steps, Distance)
  return mockHealthPermission;
}

export function useHealthAccess() {
  const [permission, setPermission] = useState<HealthPermission | null>(null);
  const [consented, setConsented] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextPermission, nextConsented] = await Promise.all([readHealthPermission(), hasWalkingConsent()]);
      setPermission(nextPermission);
      setConsented(nextConsented);
    } catch {
      // 확인에 실패하면 허용·동의하지 않은 것으로 보고 동의 화면부터 다시 보여 준다.
      setPermission('denied');
      setConsented(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 개인정보 수집에 동의한다. 기기에 저장해서 다음부터는 다시 묻지 않는다.
  // 저장에 실패해도 이번에는 그대로 진행하고, 다음에 들어올 때 다시 묻는다.
  const agree = useCallback(async () => {
    try {
      await saveWalkingConsent();
    } finally {
      setConsented(true);
    }
  }, []);

  // 개발 중에만 가짜 권한 결과를 바꾼다. 배포 빌드에서는 아무 동작도 하지 않는다.
  // [TODO: 실제 연동] 실제 권한 조회로 바꾼 뒤에는 이 함수와 mock 값을 제거한다.
  const setMockPermission = useCallback(
    (next: HealthPermission) => {
      if (!__DEV__) return;
      mockHealthPermission = next;
      refresh();
    },
    [refresh],
  );

  // 개발 중에만 저장된 동의 기록을 지운다.
  const resetConsent = useCallback(async () => {
    if (!__DEV__) return;
    await clearWalkingConsent();
    setConsented(false);
  }, []);

  const status: HealthAccessStatus = permission == null || consented == null ? 'checking' : permission === 'granted' || consented ? 'ready' : 'needs-consent';

  return { status, permission, consented, agree, setMockPermission, resetConsent };
}
