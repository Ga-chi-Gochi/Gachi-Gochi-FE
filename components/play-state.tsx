import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { PET_XP_REWARD } from '@/constants/creature-interaction';
import { getGrowthStage, type GrowthStage } from '@/constants/growth';
import {
  canExpandIsland,
  getIslandStage,
  getNextExpandZone,
  ISLAND_STAGE_MAX,
  type IslandZoneId,
} from '@/constants/island-zones';
import type { WalkingDrops } from '@/constants/walking-reward';
import type { BonggingLocationSource } from '@/lib/bongging-certification';
import { clearLocalGameData } from '@/lib/clear-local-data';
import { addCreatureXp, markGrowthLevelSeen, readCreatureState } from '@/lib/creature-state';
import { readIslandState, updateIslandState, type PlacedDecor } from '@/lib/island-state';
import { readWalkingDrops } from '@/lib/walking-reward';

export type PendingBonggingCertification = {
  imageUri: string;
  fileName?: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: BonggingLocationSource;
};

export type GrowthRevealState = {
  from: GrowthStage;
  to: GrowthStage;
};

export type ZoneUnlockReveal = {
  zoneId: IslandZoneId;
  zoneName: string;
  volcanoBurst: boolean;
};

const STAGE_BY_LEVEL: Record<number, GrowthStage> = {
  1: { level: 1, label: '알' },
  2: { level: 2, label: '새싹' },
  3: { level: 3, label: '성장' },
  4: { level: 4, label: '가치고치' },
};

/** 키우기 1회 XP (웹의 키우기 버튼에 대응) */
const GROW_XP = PET_XP_REWARD * 2;

type PlayState = {
  coins: number;
  xp: number;
  growthStacks: number;
  oxygen: number;
  water: number;
  growthStage: GrowthStage;
  islandStage: number;
  islandStageMax: number;
  canExpand: boolean;
  growthReveal: GrowthRevealState | null;
  zoneUnlockReveal: ZoneUnlockReveal | null;
  certificationPhotoUri: string | null;
  pendingCertification: PendingBonggingCertification | null;
  owned: string[];
  placed: PlacedDecor[];
  unlockedZones: IslandZoneId[];
  /** 섬에 배치하려는 아이템 (가이드 모드) */
  pendingPlaceItemId: string | null;
  /** 방금 배치되어 드롭 애니를 재생할 아이템 */
  lastPlaced: { itemId: string; zoneId: IslandZoneId } | null;
  buy: (id: string, price: number) => boolean;
  startPlacing: (itemId: string) => boolean;
  cancelPlacing: () => void;
  acknowledgeLastPlaced: () => void;
  placeDecor: (itemId: string, zoneId: IslandZoneId) => boolean;
  removeDecor: (itemId: string) => void;
  claimLocalShopReward: () => void;
  petCreature: () => Promise<void>;
  growCreature: () => Promise<boolean>;
  expandIsland: () => boolean;
  acknowledgeGrowthReveal: () => void;
  acknowledgeZoneUnlock: () => void;
  stageBonggingCertification: (pending: PendingBonggingCertification) => void;
  finishBonggingCertification: (reward: { xp: number; growthStacks: number }) => void;
  cancelBonggingCertification: () => void;
  syncWalkingDrops: (drops: WalkingDrops) => void;
  /** 로컬 저장 데이터 전부 초기화 */
  resetLocalData: () => Promise<void>;
};

const PlayStateContext = createContext<PlayState | null>(null);

export function PlayStateProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState(120);
  const [xp, setXp] = useState(0);
  const [growthStacks, setGrowthStacks] = useState(0);
  const [oxygen, setOxygen] = useState(0);
  const [water, setWater] = useState(0);
  const [certificationPhotoUri, setCertificationPhotoUri] = useState<string | null>(null);
  const [pendingCertification, setPendingCertification] = useState<PendingBonggingCertification | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [placed, setPlaced] = useState<PlacedDecor[]>([]);
  const [unlockedZones, setUnlockedZones] = useState<IslandZoneId[]>(['core']);
  const [growthReveal, setGrowthReveal] = useState<GrowthRevealState | null>(null);
  const [zoneUnlockReveal, setZoneUnlockReveal] = useState<ZoneUnlockReveal | null>(null);
  const [pendingPlaceItemId, setPendingPlaceItemId] = useState<string | null>(null);
  const [lastPlaced, setLastPlaced] = useState<{ itemId: string; zoneId: IslandZoneId } | null>(null);
  const lastSeenLevelRef = useRef(1);
  const seenZoneUnlocksRef = useRef<IslandZoneId[]>(['core']);
  const xpRef = useRef(0);
  const waterRef = useRef(0);
  const unlockedRef = useRef<IslandZoneId[]>(['core']);

  const growthStage = useMemo(() => getGrowthStage(water, xp), [water, xp]);
  const islandStage = useMemo(() => getIslandStage(unlockedZones), [unlockedZones]);
  const canExpand = useMemo(
    () => canExpandIsland(unlockedZones, xp, growthStage.level) && !zoneUnlockReveal,
    [unlockedZones, xp, growthStage.level, zoneUnlockReveal],
  );

  useEffect(() => {
    xpRef.current = xp;
  }, [xp]);

  useEffect(() => {
    waterRef.current = water;
  }, [water]);

  useEffect(() => {
    unlockedRef.current = unlockedZones;
  }, [unlockedZones]);

  const maybeRevealGrowth = useCallback((from: GrowthStage, to: GrowthStage) => {
    if (to.level <= from.level || to.level <= lastSeenLevelRef.current) {
      if (to.level > lastSeenLevelRef.current) {
        lastSeenLevelRef.current = to.level;
        void markGrowthLevelSeen(to.level);
      }
      return;
    }
    lastSeenLevelRef.current = to.level;
    setGrowthReveal({ from, to });
    void markGrowthLevelSeen(to.level);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [creature, drops, island] = await Promise.all([readCreatureState(), readWalkingDrops(), readIslandState()]);
      if (cancelled) {
        return;
      }
      setXp(creature.xp);
      setOxygen(drops.oxygen);
      setWater(drops.water);
      setCoins(island.coins);
      setOwned(island.owned);
      setPlaced(island.placed);
      setUnlockedZones(island.unlockedZones);
      unlockedRef.current = island.unlockedZones;
      xpRef.current = creature.xp;
      waterRef.current = drops.water;
      lastSeenLevelRef.current = creature.lastSeenGrowthLevel;
      seenZoneUnlocksRef.current = island.seenZoneUnlocks;

      const stage = getGrowthStage(drops.water, creature.xp);
      if (stage.level > creature.lastSeenGrowthLevel) {
        const from = STAGE_BY_LEVEL[creature.lastSeenGrowthLevel] ?? STAGE_BY_LEVEL[1];
        lastSeenLevelRef.current = stage.level;
        setGrowthReveal({ from, to: stage });
        void markGrowthLevelSeen(stage.level);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyXpGain = useCallback(
    async (amount: number) => {
      const from = getGrowthStage(waterRef.current, xpRef.current);
      const saved = await addCreatureXp(amount);
      setXp(saved.xp);
      xpRef.current = saved.xp;
      maybeRevealGrowth(from, getGrowthStage(waterRef.current, saved.xp));
      return saved.xp;
    },
    [maybeRevealGrowth],
  );

  const petCreature = useCallback(async () => {
    await applyXpGain(PET_XP_REWARD);
  }, [applyXpGain]);

  const growCreature = useCallback(async () => {
    await applyXpGain(GROW_XP);
    return true;
  }, [applyXpGain]);

  const expandIsland = useCallback(() => {
    if (zoneUnlockReveal) {
      return false;
    }
    const next = getNextExpandZone(unlockedRef.current);
    if (!next) {
      return false;
    }
    const level = getGrowthStage(waterRef.current, xpRef.current).level;
    if (!canExpandIsland(unlockedRef.current, xpRef.current, level)) {
      return false;
    }
    // 맵 안 화산 연출 후 acknowledgeZoneUnlock에서 실제 해금
    setZoneUnlockReveal({
      zoneId: next.id,
      zoneName: next.name,
      volcanoBurst: Boolean(next.volcanoBurst),
    });
    return true;
  }, [zoneUnlockReveal]);

  const acknowledgeGrowthReveal = useCallback(() => {
    setGrowthReveal(null);
  }, []);

  const acknowledgeZoneUnlock = useCallback(() => {
    setZoneUnlockReveal((current) => {
      if (!current) {
        return null;
      }
      const zoneId = current.zoneId;
      const nextIds = Array.from(new Set([...unlockedRef.current, zoneId]));
      unlockedRef.current = nextIds;
      const seen = Array.from(new Set([...seenZoneUnlocksRef.current, zoneId]));
      seenZoneUnlocksRef.current = seen;
      // 해금을 먼저 반영한 뒤 reveal를 닫아 타일이 깜빡이지 않게 함
      setUnlockedZones(nextIds);
      void updateIslandState((record) => ({
        ...record,
        seenZoneUnlocks: seen,
        unlockedZones: nextIds,
      }));
      return null;
    });
  }, []);

  const resetLocalData = useCallback(async () => {
    await clearLocalGameData();
    setCoins(120);
    setXp(0);
    setGrowthStacks(0);
    setOxygen(0);
    setWater(0);
    setCertificationPhotoUri(null);
    setPendingCertification(null);
    setOwned([]);
    setPlaced([]);
    setUnlockedZones(['core']);
    setGrowthReveal(null);
    setZoneUnlockReveal(null);
    setPendingPlaceItemId(null);
    setLastPlaced(null);
    lastSeenLevelRef.current = 1;
    seenZoneUnlocksRef.current = ['core'];
    xpRef.current = 0;
    waterRef.current = 0;
    unlockedRef.current = ['core'];
  }, []);

  const value = useMemo<PlayState>(
    () => ({
      coins,
      xp,
      growthStacks,
      oxygen,
      water,
      growthStage,
      islandStage,
      islandStageMax: ISLAND_STAGE_MAX,
      canExpand,
      growthReveal,
      zoneUnlockReveal,
      certificationPhotoUri,
      pendingCertification,
      owned,
      placed,
      unlockedZones,
      pendingPlaceItemId,
      lastPlaced,
      buy: (id, price) => {
        if (owned.includes(id) || coins < price) {
          return false;
        }
        const nextCoins = coins - price;
        const nextOwned = [...owned, id];
        setCoins(nextCoins);
        setOwned(nextOwned);
        void updateIslandState((current) => ({ ...current, coins: nextCoins, owned: nextOwned }));
        return true;
      },
      startPlacing: (itemId) => {
        if (!owned.includes(itemId)) {
          return false;
        }
        if (placed.some((entry) => entry.itemId === itemId)) {
          return false;
        }
        setPendingPlaceItemId(itemId);
        return true;
      },
      cancelPlacing: () => {
        setPendingPlaceItemId(null);
      },
      acknowledgeLastPlaced: () => {
        setLastPlaced(null);
      },
      placeDecor: (itemId, zoneId) => {
        if (!owned.includes(itemId) || !unlockedZones.includes(zoneId)) {
          return false;
        }
        if (placed.some((entry) => entry.itemId === itemId)) {
          return false;
        }
        const next = [...placed, { itemId, zoneId }];
        setPlaced(next);
        setPendingPlaceItemId(null);
        setLastPlaced({ itemId, zoneId });
        void updateIslandState((current) => ({ ...current, placed: next }));
        return true;
      },
      removeDecor: (itemId) => {
        const next = placed.filter((entry) => entry.itemId !== itemId);
        setPlaced(next);
        void updateIslandState((current) => ({ ...current, placed: next }));
      },
      claimLocalShopReward: () => {
        const nextCoins = coins + 50;
        setCoins(nextCoins);
        void updateIslandState((current) => ({ ...current, coins: nextCoins }));
      },
      petCreature,
      growCreature,
      expandIsland,
      acknowledgeGrowthReveal,
      acknowledgeZoneUnlock,
      stageBonggingCertification: (pending) => {
        setPendingCertification(pending);
      },
      finishBonggingCertification: (reward) => {
        if (!pendingCertification) {
          return;
        }
        const photoUri = pendingCertification.imageUri;
        setPendingCertification(null);
        setGrowthStacks((current) => current + reward.growthStacks);
        setCertificationPhotoUri(photoUri);
        void applyXpGain(reward.xp);
      },
      cancelBonggingCertification: () => {
        setPendingCertification(null);
      },
      syncWalkingDrops: (drops) => {
        const from = getGrowthStage(waterRef.current, xpRef.current);
        setOxygen(drops.oxygen);
        setWater(drops.water);
        waterRef.current = drops.water;
        maybeRevealGrowth(from, getGrowthStage(drops.water, xpRef.current));
      },
      resetLocalData,
    }),
    [
      coins,
      xp,
      growthStacks,
      oxygen,
      water,
      growthStage,
      islandStage,
      canExpand,
      growthReveal,
      zoneUnlockReveal,
      certificationPhotoUri,
      pendingCertification,
      owned,
      placed,
      unlockedZones,
      pendingPlaceItemId,
      lastPlaced,
      petCreature,
      growCreature,
      expandIsland,
      acknowledgeGrowthReveal,
      acknowledgeZoneUnlock,
      applyXpGain,
      maybeRevealGrowth,
      resetLocalData,
    ],
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
