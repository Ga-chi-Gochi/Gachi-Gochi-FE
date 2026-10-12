import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { WalkingDrops } from '@/constants/walking-reward';
import type { BonggingLocationSource } from '@/lib/bongging-certification';
import { loadWalkingReward } from '@/lib/walking-reward';

export type PendingBonggingCertification = {
  imageUri: string;
  fileName?: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: BonggingLocationSource;
};

type PlayState = {
  coins: number;
  xp: number;
  growthStacks: number;
  walkingDrops: WalkingDrops;
  certificationPhotoUri: string | null;
  pendingCertification: PendingBonggingCertification | null;
  owned: string[];
  buy: (id: string, price: number) => boolean;
  stageBonggingCertification: (pending: PendingBonggingCertification) => void;
  finishBonggingCertification: (reward: { xp: number; growthStacks: number }) => void;
  cancelBonggingCertification: () => void;
  syncWalkingDrops: (drops: WalkingDrops) => void;
};

const PlayStateContext = createContext<PlayState | null>(null);

export function PlayStateProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState(120);
  const [xp, setXp] = useState(0);
  const [growthStacks, setGrowthStacks] = useState(0);
  const [walkingDrops, setWalkingDrops] = useState<WalkingDrops>({ oxygen: 0, water: 0 });
  const [certificationPhotoUri, setCertificationPhotoUri] = useState<string | null>(null);
  const [pendingCertification, setPendingCertification] = useState<PendingBonggingCertification | null>(null);
  const [owned, setOwned] = useState<string[]>([]);

  useEffect(() => {
    loadWalkingReward()
      .then(({ drops }) => setWalkingDrops(drops))
      .catch(() => undefined);
  }, []);

  const value = useMemo<PlayState>(
    () => ({
      coins,
      xp,
      growthStacks,
      walkingDrops,
      certificationPhotoUri,
      pendingCertification,
      owned,
      buy: (id, price) => {
        if (owned.includes(id) || coins < price) {
          return false;
        }
        setCoins((current) => current - price);
        setOwned((current) => [...current, id]);
        return true;
      },
      stageBonggingCertification: (pending) => {
        setPendingCertification(pending);
      },
      finishBonggingCertification: (reward) => {
        if (!pendingCertification) {
          return;
        }
        setXp((current) => current + reward.xp);
        setGrowthStacks((current) => current + reward.growthStacks);
        setCertificationPhotoUri(pendingCertification.imageUri);
        setPendingCertification(null);
      },
      cancelBonggingCertification: () => {
        setPendingCertification(null);
      },
      syncWalkingDrops: setWalkingDrops,
    }),
    [coins, xp, growthStacks, walkingDrops, certificationPhotoUri, pendingCertification, owned],
  );

  return <PlayStateContext.Provider value={value}>{children}</PlayStateContext.Provider>;
}

export function usePlayState() {
  const value = useContext(PlayStateContext);
  if (!value) {
    throw new Error('PlayStateProvider가 필요합니다.');
  }
  return value;
}
