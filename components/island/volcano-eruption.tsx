import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { VOLCANO_ERUPT_MS } from '@/components/island/volcano-sprite';

type EruptPhase = 'idle' | 'erupt' | 'gas';

type VolcanoEruptionValue = {
  /** 분화가 시작될 때마다 1씩 오른다. */
  token: number;
  phase: EruptPhase;
  erupt: () => void;
  finish: () => void;
};

const VolcanoEruptionContext = createContext<VolcanoEruptionValue | null>(null);

export function VolcanoEruptionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(0);
  const [phase, setPhase] = useState<EruptPhase>('idle');

  const erupt = useCallback(() => {
    if (phase !== 'idle') {
      return;
    }
    setToken((count) => count + 1);
    setPhase('erupt');
  }, [phase]);

  const finish = useCallback(() => {
    setPhase('idle');
  }, []);

  useEffect(() => {
    if (phase !== 'erupt') {
      return;
    }
    const timer = setTimeout(() => setPhase('gas'), VOLCANO_ERUPT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const value = useMemo(() => ({ token, phase, erupt, finish }), [token, phase, erupt, finish]);
  return <VolcanoEruptionContext.Provider value={value}>{children}</VolcanoEruptionContext.Provider>;
}

export function useVolcanoEruption() {
  const value = useContext(VolcanoEruptionContext);
  if (!value) {
    throw new Error('VolcanoEruptionProvider가 없습니다.');
  }
  return value;
}
