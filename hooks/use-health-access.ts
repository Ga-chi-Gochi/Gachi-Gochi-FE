import { useCallback, useEffect, useState } from 'react';

import {
  getHealthStepsPermission,
  requestHealthStepsPermission,
  type HealthStepsPermission,
} from '@/lib/health-steps';
import { clearWalkingConsent, hasWalkingConsent, saveWalkingConsent } from '@/lib/walking-consent';

export type HealthPermission = HealthStepsPermission;

// checking: 확인 중 / ready: 걸음을 불러와도 됨 / needs-consent: 개인정보 수집 동의가 필요함
export type HealthAccessStatus = 'checking' | 'ready' | 'needs-consent';

export function useHealthAccess() {
  const [permission, setPermission] = useState<HealthPermission | null>(null);
  const [consented, setConsented] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextPermission, nextConsented] = await Promise.all([getHealthStepsPermission(), hasWalkingConsent()]);
      setPermission(nextPermission);
      setConsented(nextConsented);
    } catch {
      // 확인에 실패하면 허용·동의하지 않은 것으로 보고 동의 화면부터 다시 보여 준다.
      setPermission('denied');
      setConsented(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [nextPermission, nextConsented] = await Promise.all([getHealthStepsPermission(), hasWalkingConsent()]);
        if (!alive) {
          return;
        }
        setPermission(nextPermission);
        setConsented(nextConsented);
      } catch {
        if (!alive) {
          return;
        }
        setPermission('denied');
        setConsented(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 개인정보 수집에 동의한다. 기기에 저장해서 다음부터는 다시 묻지 않는다.
  // 저장에 실패해도 이번에는 그대로 진행하고, 다음에 들어올 때 다시 묻는다.
  const agree = useCallback(async () => {
    try {
      await saveWalkingConsent();
    } finally {
      setConsented(true);
      // 동의 직후 건강 앱 권한도 바로 요청한다.
      const next = await requestHealthStepsPermission();
      setPermission(next);
    }
  }, []);

  // 개발 중에만 가짜 권한 결과를 보여 주기 위한 자리. 실제 권한은 건강 앱이 담당한다.
  const setMockPermission = useCallback((_next: HealthPermission) => {
    if (!__DEV__) return;
    void refresh();
  }, [refresh]);

  // 개발 중에만 저장된 동의 기록을 지운다.
  const resetConsent = useCallback(async () => {
    if (!__DEV__) return;
    await clearWalkingConsent();
    setConsented(false);
  }, []);

  const status: HealthAccessStatus =
    permission == null || consented == null
      ? 'checking'
      : permission === 'granted' || consented || permission === 'unavailable'
        ? 'ready'
        : 'needs-consent';

  return { status, permission, consented, agree, setMockPermission, resetConsent, refreshPermission: refresh };
}
