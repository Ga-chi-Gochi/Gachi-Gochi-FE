import { useCallback, useEffect, useState } from 'react';

import { VISIBLE_ISLAND_LOOKS, type IslandLook } from '@/components/island/beach-home';
import { normalizeIslandLook, readIslandLook, writeIslandLook } from '@/lib/island-look';

/** 섬 look 공용 훅. 홈에서 setLook 하면 AsyncStorage 에 저장되고 웰컴도 같은 값을 읽는다. */
export function useIslandLook() {
  const [look, setLookState] = useState<IslandLook>(VISIBLE_ISLAND_LOOKS[0] ?? 1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void readIslandLook().then((saved) => {
      if (!alive) {
        return;
      }
      setLookState(saved);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setLook = useCallback((next: IslandLook) => {
    const normalized = normalizeIslandLook(next);
    setLookState(normalized);
    void writeIslandLook(normalized);
  }, []);

  return { look, setLook, ready };
}
