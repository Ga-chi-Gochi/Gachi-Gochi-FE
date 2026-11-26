import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import {
  getHealthStepsSource,
  readTodayHealthSteps,
  requestHealthStepsPermission,
  type HealthStepsPermission,
  type HealthStepsSource,
} from '@/lib/health-steps';

export type HealthStepsStatus = 'loading' | 'ready' | 'denied' | 'unavailable';

const REFRESH_MS = 20000;

/**
 * HealthKit(iOS) / Health Connect(Android) 로 오늘 누적 걸음을 읽는다.
 * 화면이 보일 때 권한을 요청하고, 포커스 중에는 주기적으로 다시 읽는다.
 */
export function useHealthSteps() {
  const [status, setStatus] = useState<HealthStepsStatus>('loading');
  const [steps, setSteps] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [source, setSource] = useState<HealthStepsSource | null>(getHealthStepsSource());
  const runRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pull = useCallback(async (permission: HealthStepsPermission) => {
    if (permission === 'unavailable') {
      setStatus('unavailable');
      setSteps(0);
      setDistanceMeters(null);
      return;
    }
    if (permission !== 'granted') {
      setStatus('denied');
      setSteps(0);
      setDistanceMeters(null);
      return;
    }

    const today = await readTodayHealthSteps();
    setSteps(today.steps);
    setDistanceMeters(today.distanceMeters);
    setSource(today.source ?? getHealthStepsSource());
    setStatus('ready');
  }, []);

  const start = useCallback(async () => {
    stopPolling();
    const run = ++runRef.current;
    const isCurrent = () => runRef.current === run;

    setStatus('loading');
    const permission = await requestHealthStepsPermission();
    if (!isCurrent()) {
      return;
    }
    await pull(permission);
    if (!isCurrent() || permission !== 'granted') {
      return;
    }

    timerRef.current = setInterval(() => {
      void pull('granted');
    }, REFRESH_MS);
  }, [pull, stopPolling]);

  useFocusEffect(
    useCallback(() => {
      void start();
      return () => {
        runRef.current += 1;
        stopPolling();
      };
    }, [start, stopPolling]),
  );

  const refresh = useCallback(() => start(), [start]);

  return { steps, distanceMeters, status, source, refresh };
}
