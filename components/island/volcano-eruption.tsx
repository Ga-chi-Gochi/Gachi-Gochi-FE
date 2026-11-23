import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type EruptPhase = 'idle' | 'erupt' | 'gas';

/** 용암이 분화구를 채운 뒤 잠깐 끓고, 테두리 밖으로 넘치면 화산재가 퍼진다. */
export const LAVA_FILL_MS = 1200;
export const LAVA_BOIL_MS = 480;
export const LAVA_SPILL_MS = 360;

type VolcanoEruptionValue = {
  /** 분화가 시작될 때마다 1씩 오른다. */
  token: number;
  phase: EruptPhase;
  shaking: boolean;
  /** 분화구 안 용암 픽셀이 차오르고 넘치는 동안이다. */
  boiling: boolean;
  /** 이미 분화 중이면 false */
  erupt: () => boolean;
  /** 구름이 터지면 흔들림을 멈춘다. */
  calm: () => void;
  /** 넘침이 끝나면 화산재가 퍼진다. */
  openFog: () => void;
  finish: () => void;
};

const VolcanoEruptionContext = createContext<VolcanoEruptionValue | null>(null);

export function VolcanoEruptionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(0);
  const [phase, setPhase] = useState<EruptPhase>('idle');
  const [shaking, setShaking] = useState(false);
  const [boiling, setBoiling] = useState(false);

  const erupt = useCallback(() => {
    if (phase !== 'idle') {
      return false;
    }
    setToken((count) => count + 1);
    setShaking(true);
    setBoiling(true);
    setPhase('erupt');
    return true;
  }, [phase]);

  const calm = useCallback(() => {
    setShaking(false);
  }, []);

  const openFog = useCallback(() => {
    setBoiling(false);
    setShaking(false);
    setPhase('gas');
  }, []);

  const finish = useCallback(() => {
    setBoiling(false);
    setShaking(false);
    setPhase('idle');
  }, []);

  const value = useMemo(
    () => ({ token, phase, shaking, boiling, erupt, calm, openFog, finish }),
    [boiling, calm, erupt, finish, openFog, phase, shaking, token],
  );
  return <VolcanoEruptionContext.Provider value={value}>{children}</VolcanoEruptionContext.Provider>;
}

export function useVolcanoEruption() {
  const value = useContext(VolcanoEruptionContext);
  if (!value) {
    throw new Error('VolcanoEruptionProvider가 없습니다.');
  }
  return value;
}
