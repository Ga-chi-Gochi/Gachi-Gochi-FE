import { useFocusEffect } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type PedometerStatus = 'loading' | 'ready' | 'denied' | 'unavailable';

type Subscription = ReturnType<typeof Pedometer.watchStepCount>;

function startOfToday(now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

async function checkAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

async function requestGranted(): Promise<boolean> {
  try {
    const { granted } = await Pedometer.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

async function readTodayBase(): Promise<number> {
  if (Platform.OS !== 'ios') {
    return 0;
  }
  try {
    const now = new Date();
    const { steps } = await Pedometer.getStepCountAsync(startOfToday(now), now);
    return steps;
  } catch {
    return 0;
  }
}

export function usePedometerSteps() {
  const [status, setStatus] = useState<PedometerStatus>('loading');
  const [baseSteps, setBaseSteps] = useState(0);
  const [liveSteps, setLiveSteps] = useState(0);
  const subscriptionRef = useRef<Subscription | null>(null);
  const runRef = useRef(0);

  const stop = useCallback(() => {
    runRef.current += 1;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stop();
    const run = runRef.current;
    const isCurrent = () => runRef.current === run;

    if (!(await checkAvailable())) {
      if (isCurrent()) setStatus('unavailable');
      return;
    }
    if (!(await requestGranted())) {
      if (isCurrent()) setStatus('denied');
      return;
    }
    const base = await readTodayBase();
    if (!isCurrent()) {
      return;
    }
    setBaseSteps(base);
    setLiveSteps(0);
    try {
      subscriptionRef.current = Pedometer.watchStepCount(({ steps }) => {
        if (isCurrent()) setLiveSteps(steps);
      });
    } catch {
      subscriptionRef.current = null;
    }
    setStatus('ready');
  }, [stop]);

  useFocusEffect(
    useCallback(() => {
      void start();
      return stop;
    }, [start, stop]),
  );

  const refresh = useCallback(() => start(), [start]);

  const steps = status === 'ready' ? baseSteps + liveSteps : 0;

  return { steps, status, refresh };
}
