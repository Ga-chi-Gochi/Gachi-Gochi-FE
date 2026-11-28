import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { PET_XP_REWARD } from '@/constants/creature-interaction';
import {
  EXPLORE_DAILY_LIMIT,
  EXPLORE_DURATION_MS,
  EXPLORE_FOREST_ZONE,
  exploreProgress,
  formatExploreRemain,
  getExploreCharacter,
  ownedExploreCharacterIds,
  ownsExploreCharacter,
  type ExploreCharacterId,
} from '@/constants/explore';
import { getGrowthStage, getGrowthStageByLevel, type GrowthStage } from '@/constants/growth';
import {
  canExpandIsland,
  getIslandStage,
  getNextExpandZone,
  getZone,
  ISLAND_STAGE_MAX,
  type IslandZoneId,
} from '@/constants/island-zones';
import type { WalkingDrops } from '@/constants/walking-reward';
import type { BonggingLocationSource } from '@/lib/bongging-certification';
import { clearLocalGameData } from '@/lib/clear-local-data';
import {
  addCreatureXp,
  markGrowthLevelSeen,
  readCreatureState,
  setPendingGrowthLevel,
} from '@/lib/creature-state';
import { dispatchExploreTrip } from '@/lib/explore-api';
import {
  beginExploreClock,
  claimExploreReward,
  completeExploreTripIfDone,
  markGochiEggSeen,
  readExploreState,
  startExploreTrip,
  type ExploreStateRecord,
} from '@/lib/explore-state';
import { readIslandState, updateIslandState, type PlacedDecor } from '@/lib/island-state';
import { readWalkingDrops } from '@/lib/walking-reward';

export type ExploreEggReveal = {
  eggCount: number;
  gochiId: string;
  eggId: string;
  isNewType: boolean;
};

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

/** 홈이 아닐 때 임계값 도달 → 섬으로 가라는 안내 */
export type HomeInvite = {
  kind: 'growth' | 'island';
  title: string;
  body: string;
};

const STAGE_BY_LEVEL: Record<number, GrowthStage> = {
  1: getGrowthStageByLevel(1),
  2: getGrowthStageByLevel(2),
  3: getGrowthStageByLevel(3),
  4: getGrowthStageByLevel(4),
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
  /** 성장 연출·섬 확장 연출 중이면 키우기 등 입력을 잠근다 */
  growLocked: boolean;
  /** 화산·구름 섬 확장 연출이 끝날 때까지 true (done 에서 해제) */
  islandExpandBusy: boolean;
  growthReveal: GrowthRevealState | null;
  zoneUnlockReveal: ZoneUnlockReveal | null;
  /** 다른 화면에서 성장/섬 임계에 닿았을 때 홈으로 유도 */
  homeInvite: HomeInvite | null;
  /**
   * 홈에서 섬 확장 연출(화산)을 자동으로 켤 때 올라가는 신호.
   * 값이 바뀌면 Island 쪽에서 예전「섬 넓히기」와 같이 erupt() 만 호출한다.
   */
  homeExpandSignal: number;
  /** erupt 를 시작하지 못했을 때 busy 를 풀어, 다음에 다시 시도할 수 있게 한다 */
  releaseIslandExpandAttempt: () => void;
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
  addCoins: (amount: number) => void;
  addXp: (amount: number) => Promise<void>;
  petCreature: () => Promise<void>;
  growCreature: () => Promise<boolean>;
  expandIsland: () => boolean;
  /** 가스에 가려진 동안 다음 땅을 바로 붙인다. 올라오는 연출은 없다. */
  revealExpandedZone: () => boolean;
  acknowledgeGrowthReveal: () => void;
  acknowledgeZoneUnlock: () => void;
  /** 홈 탭 focus 여부를 알려, 대기 중인 연출을 재생한다 */
  setHomeActive: (active: boolean) => void;
  dismissHomeInvite: () => void;
  stageBonggingCertification: (pending: PendingBonggingCertification) => void;
  finishBonggingCertification: (reward: { xp: number; growthStacks: number }) => void;
  cancelBonggingCertification: () => void;
  syncWalkingDrops: (drops: WalkingDrops) => void;
  /** 로컬 저장 데이터 전부 초기화 */
  resetLocalData: () => Promise<void>;
  /** 서쪽 숲 해금 여부 — 탐험 진입점 */
  exploreForestUnlocked: boolean;
  exploreRemaining: number;
  exploreDailyLimit: number;
  exploreEndsAt: number | null;
  exploreStartedAt: number | null;
  exploreProgress: number;
  exploringGochiId: string | null;
  /** 모험 중(숲 진입 연출 포함). 타이머가 아직 안 돌아도 true */
  isExploring: boolean;
  /** 숲 진입 전 — 소요 시간은 아직 안 흐름 */
  isExploreEntering: boolean;
  /** 타이머 끝, 보상 수령 대기 */
  hasExploreReward: boolean;
  pendingExploreGochiId: string | null;
  exploreEggCount: number;
  /** 종류별 보유 수 (도감·인벤 공용) */
  gochiEggs: Record<string, number>;
  /** NEW 뱃지용 */
  newGochiEggIds: string[];
  exploreEggReveal: ExploreEggReveal | null;
  canStartExplore: boolean;
  exploreRemainLabel: string;
  startExplore: (input: { gochiId: string; durationMs?: number }) => Promise<boolean>;
  /** 고치가 숲에 들어간 뒤 호출 — 소요 시간 카운트 시작 */
  markExploreEntered: () => Promise<void>;
  claimExploreEgg: (options?: { eggId?: string }) => Promise<boolean>;
  acknowledgeExploreEggReveal: () => void;
  markGochiEggDetailSeen: (eggId: string) => Promise<void>;
  /** 앱 복귀·화면 포커스 시 탐험 상태 재동기화 */
  syncExplore: () => Promise<void>;
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
  const [homeInvite, setHomeInvite] = useState<HomeInvite | null>(null);
  const [homeExpandSignal, setHomeExpandSignal] = useState(0);
  const [islandExpandBusy, setIslandExpandBusy] = useState(false);
  const [growInFlight, setGrowInFlight] = useState(false);
  const growInFlightRef = useRef(false);
  const [pendingPlaceItemId, setPendingPlaceItemId] = useState<string | null>(null);
  const [lastPlaced, setLastPlaced] = useState<{ itemId: string; zoneId: IslandZoneId } | null>(null);
  const [exploreRemaining, setExploreRemaining] = useState(EXPLORE_DAILY_LIMIT);
  const [exploreEndsAt, setExploreEndsAt] = useState<number | null>(null);
  const [exploreStartedAt, setExploreStartedAt] = useState<number | null>(null);
  const [explorePendingDurationMs, setExplorePendingDurationMs] = useState<number | null>(null);
  const [exploringGochiId, setExploringGochiId] = useState<string | null>(null);
  const [pendingExploreGochiId, setPendingExploreGochiId] = useState<string | null>(null);
  const [exploreEggCount, setExploreEggCount] = useState(0);
  const [gochiEggs, setGochiEggs] = useState<Record<string, number>>({});
  const [newGochiEggIds, setNewGochiEggIds] = useState<string[]>([]);
  const [exploreEggReveal, setExploreEggReveal] = useState<ExploreEggReveal | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const lastSeenLevelRef = useRef(1);
  const seenZoneUnlocksRef = useRef<IslandZoneId[]>(['core']);
  const xpRef = useRef(0);
  const waterRef = useRef(0);
  const unlockedRef = useRef<IslandZoneId[]>(['core']);
  const homeActiveRef = useRef(false);
  const pendingGrowthLevelRef = useRef<number | null>(null);
  const pendingExpandZoneRef = useRef<IslandZoneId | null>(null);
  const growthRevealRef = useRef<GrowthRevealState | null>(null);
  const zoneUnlockRevealRef = useRef<ZoneUnlockReveal | null>(null);
  /** 화산 연출이 돌고 있는 동안 중복 확장을 막는다 (예전 수동 넓히기와 같은 한 길) */
  const islandExpandBusyRef = useRef(false);

  const growthStage = useMemo(() => getGrowthStage(xp), [xp]);
  const islandStage = useMemo(() => getIslandStage(unlockedZones), [unlockedZones]);
  const canExpand = useMemo(
    () => canExpandIsland(unlockedZones, xp) && !zoneUnlockReveal && !islandExpandBusy,
    [unlockedZones, xp, zoneUnlockReveal, islandExpandBusy],
  );
  const growLocked = Boolean(growthReveal) || islandExpandBusy || growInFlight;
  const exploreForestUnlocked = unlockedZones.includes(EXPLORE_FOREST_ZONE);
  const isExploreTiming = exploreEndsAt != null && exploreEndsAt > nowTick;
  const isExploreEntering =
    Boolean(exploringGochiId) && explorePendingDurationMs != null && !isExploreTiming;
  /** 파견 중(진입 연출·타이머) — 섬 애니·고치 숨김에 사용 */
  const isExploring = isExploreTiming || isExploreEntering;
  const hasExploreReward = Boolean(pendingExploreGochiId);
  const canStartExplore =
    exploreForestUnlocked && !isExploring && !hasExploreReward && exploreRemaining > 0;
  const exploreRemainLabel = isExploreTiming && exploreEndsAt
    ? formatExploreRemain(exploreEndsAt - nowTick)
    : isExploreEntering && explorePendingDurationMs
      ? formatExploreRemain(explorePendingDurationMs)
      : '00:00';
  const exploreProgressValue = isExploreTiming
    ? exploreProgress(exploreStartedAt, exploreEndsAt, nowTick)
    : 0;

  useEffect(() => {
    xpRef.current = xp;
  }, [xp]);

  useEffect(() => {
    waterRef.current = water;
  }, [water]);

  useEffect(() => {
    unlockedRef.current = unlockedZones;
  }, [unlockedZones]);

  useEffect(() => {
    growthRevealRef.current = growthReveal;
  }, [growthReveal]);

  useEffect(() => {
    zoneUnlockRevealRef.current = zoneUnlockReveal;
  }, [zoneUnlockReveal]);

  const inviteHome = useCallback((kind: HomeInvite['kind'], title: string, body: string) => {
    setHomeInvite((current) => current ?? { kind, title, body });
  }, []);

  /**
   * 홈에서 섬 확장을 시작한다.
   * 예전 수동「섬 넓히기」와 같이 zoneUnlockReveal 을 먼저 켜지 않고,
   * pending 만 남긴 뒤 erupt 신호만 올린다. (해금은 화산재 속 revealExpandedZone)
   */
  const beginIslandExpand = useCallback((zoneId: IslandZoneId) => {
    if (islandExpandBusyRef.current) {
      return false;
    }
    const zone = getZone(zoneId);
    if (!zone || unlockedRef.current.includes(zoneId)) {
      return false;
    }
    pendingExpandZoneRef.current = zoneId;
    void updateIslandState((record) => ({ ...record, pendingExpandZoneId: zoneId }));
    islandExpandBusyRef.current = true;
    setIslandExpandBusy(true);
    setHomeExpandSignal((current) => current + 1);
    return true;
  }, []);

  const releaseIslandExpandAttempt = useCallback(() => {
    islandExpandBusyRef.current = false;
    setIslandExpandBusy(false);
  }, []);

  const showGrowthReveal = useCallback((from: GrowthStage, to: GrowthStage) => {
    const reveal = { from, to };
    growthRevealRef.current = reveal;
    setGrowthReveal(reveal);
  }, []);

  /**
   * 홈에 있을 때 대기 중인 성장 → 섬 확장 순으로 연출을 재생한다.
   * 성장 연출이 열려 있으면 섬은 그 다음(acknowledge 후)에 한다.
   */
  const flushHomeReveals = useCallback(() => {
    if (!homeActiveRef.current) {
      return;
    }
    setHomeInvite(null);
    if (growthRevealRef.current || islandExpandBusyRef.current) {
      return;
    }
    const pendingLevel = pendingGrowthLevelRef.current;
    if (pendingLevel != null && pendingLevel > lastSeenLevelRef.current) {
      const from = STAGE_BY_LEVEL[lastSeenLevelRef.current] ?? STAGE_BY_LEVEL[1];
      const to = STAGE_BY_LEVEL[pendingLevel] ?? getGrowthStage(xpRef.current);
      showGrowthReveal(from, to);
      return;
    }
    const pendingZone = pendingExpandZoneRef.current;
    if (pendingZone && !unlockedRef.current.includes(pendingZone)) {
      beginIslandExpand(pendingZone);
    }
  }, [beginIslandExpand, showGrowthReveal]);

  const queueGrowthUp = useCallback(
    (from: GrowthStage, to: GrowthStage) => {
      if (to.level <= from.level || to.level <= lastSeenLevelRef.current) {
        return;
      }
      pendingGrowthLevelRef.current = to.level;
      void setPendingGrowthLevel(to.level);
      if (homeActiveRef.current) {
        if (!growthRevealRef.current) {
          showGrowthReveal(from, to);
        }
        return;
      }
      inviteHome('growth', '고치가 성장했어요!', '섬으로 돌아가면 성장 연출을 볼 수 있어요.');
    },
    [inviteHome, showGrowthReveal],
  );

  const queueIslandExpand = useCallback(
    (prevXp: number, nextXp: number) => {
      const next = getNextExpandZone(unlockedRef.current);
      if (!next || nextXp < next.unlockXp || prevXp >= next.unlockXp) {
        return;
      }
      if (unlockedRef.current.includes(next.id)) {
        return;
      }
      // 아직 pending 만 있고 연출 전이면, 홈에서는 바로 erupt 경로로 이어서 켠다
      if (pendingExpandZoneRef.current !== next.id) {
        pendingExpandZoneRef.current = next.id;
        void updateIslandState((record) => ({ ...record, pendingExpandZoneId: next.id }));
      }
      if (homeActiveRef.current) {
        if (!growthRevealRef.current) {
          beginIslandExpand(next.id);
        }
        return;
      }
      inviteHome('island', '섬이 넓어질 준비가 됐어요!', '섬으로 돌아가면 땅이 이어지는 연출을 볼 수 있어요.');
    },
    [beginIslandExpand, inviteHome],
  );

  const applyExploreRecord = useCallback((explore: ExploreStateRecord) => {
    setExploreRemaining(explore.remaining);
    setExploreEndsAt(explore.exploringUntil);
    setExploreStartedAt(explore.exploringStartedAt);
    setExplorePendingDurationMs(explore.pendingDurationMs);
    setExploringGochiId(explore.dispatchedGochiId);
    setPendingExploreGochiId(explore.pendingRewardGochiId);
    setExploreEggCount(explore.eggCount);
    setGochiEggs(explore.eggs);
    setNewGochiEggIds(explore.newEggIds);
    setNowTick(Date.now());
  }, []);

  /** 저장소 기준으로 재동기화 — 백그라운드 중 만료되면 수령 대기로 전환 */
  const syncExplore = useCallback(async () => {
    const record = await completeExploreTripIfDone();
    applyExploreRecord(record);
  }, [applyExploreRecord]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [creature, drops, island, explore] = await Promise.all([
        readCreatureState(),
        readWalkingDrops(),
        readIslandState(),
        readExploreState(),
      ]);
      if (cancelled) {
        return;
      }
      setXp(creature.xp);
      setOxygen(drops.oxygen);
      // 물방울은 성장에 쓰지 않는다. 저장값만 읽어 두고 UI에서는 제외.
      setWater(0);
      setCoins(island.coins);
      setOwned(island.owned);
      setPlaced(island.placed);
      setUnlockedZones(island.unlockedZones);
      unlockedRef.current = island.unlockedZones;
      xpRef.current = creature.xp;
      waterRef.current = 0;
      lastSeenLevelRef.current = creature.lastSeenGrowthLevel;
      seenZoneUnlocksRef.current = island.seenZoneUnlocks;
      pendingGrowthLevelRef.current = creature.pendingGrowthLevel;
      pendingExpandZoneRef.current = island.pendingExpandZoneId;
      applyExploreRecord(explore);

      const stage = getGrowthStage(creature.xp);
      if (creature.pendingGrowthLevel == null && stage.level > creature.lastSeenGrowthLevel) {
        pendingGrowthLevelRef.current = stage.level;
        void setPendingGrowthLevel(stage.level);
      }
      if (
        island.pendingExpandZoneId == null &&
        canExpandIsland(island.unlockedZones, creature.xp)
      ) {
        const next = getNextExpandZone(island.unlockedZones);
        if (next) {
          pendingExpandZoneRef.current = next.id;
          void updateIslandState((record) => ({ ...record, pendingExpandZoneId: next.id }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyExploreRecord]);

  /** 앱 복귀 시 즉시 재동기화 */
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active') {
        void syncExplore();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [syncExplore]);

  /** 남은 시간·프로그레스 UI 틱 (섬·탐험 화면 공통) */
  useEffect(() => {
    const tickMs = exploreEndsAt ? 200 : 1000;
    const timer = setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      if (exploreEndsAt && exploreEndsAt <= now) {
        void syncExplore();
      }
    }, tickMs);
    return () => clearInterval(timer);
  }, [exploreEndsAt, syncExplore]);

  /** 탐험 진행 중 1초마다 저장소 재동기화 (이탈·복귀·백그라운드 보정) */
  useEffect(() => {
    if (!exploreEndsAt) {
      return;
    }
    const poll = setInterval(() => {
      void syncExplore();
    }, 1000);
    return () => clearInterval(poll);
  }, [exploreEndsAt, syncExplore]);

  const applyXpGain = useCallback(
    async (amount: number) => {
      const prevXp = xpRef.current;
      const from = getGrowthStage(prevXp);
      const saved = await addCreatureXp(amount);
      setXp(saved.xp);
      xpRef.current = saved.xp;
      const to = getGrowthStage(saved.xp);
      queueGrowthUp(from, to);
      queueIslandExpand(prevXp, saved.xp);
      return saved.xp;
    },
    [queueGrowthUp, queueIslandExpand],
  );

  const petCreature = useCallback(async () => {
    await applyXpGain(PET_XP_REWARD);
  }, [applyXpGain]);

  const growCreature = useCallback(async () => {
    if (growInFlightRef.current || growthRevealRef.current || islandExpandBusyRef.current) {
      return false;
    }
    growInFlightRef.current = true;
    setGrowInFlight(true);
    try {
      await applyXpGain(GROW_XP);
      return true;
    } finally {
      // 성장/확장 연출이 걸렸으면 그쪽 락이 이어 받고, 아니면 연타 락만 푼다
      growInFlightRef.current = false;
      setGrowInFlight(false);
    }
  }, [applyXpGain]);

  const expandIsland = useCallback(() => {
    const next = getNextExpandZone(unlockedRef.current);
    if (!next) {
      return false;
    }
    if (!canExpandIsland(unlockedRef.current, xpRef.current) && pendingExpandZoneRef.current !== next.id) {
      return false;
    }
    return beginIslandExpand(next.id);
  }, [beginIslandExpand]);

  const acknowledgeGrowthReveal = useCallback(() => {
    const current = growthRevealRef.current;
    growthRevealRef.current = null;
    setGrowthReveal(null);
    if (current) {
      lastSeenLevelRef.current = Math.max(lastSeenLevelRef.current, current.to.level);
      pendingGrowthLevelRef.current =
        pendingGrowthLevelRef.current != null && pendingGrowthLevelRef.current <= current.to.level
          ? null
          : pendingGrowthLevelRef.current;
      void markGrowthLevelSeen(current.to.level);
    }
    // 성장 다음으로 대기 중인 섬 확장이 있으면 이어서 재생
    flushHomeReveals();
  }, [flushHomeReveals]);

  const revealExpandedZone = useCallback(() => {
    const next = getNextExpandZone(unlockedRef.current);
    if (!next) {
      return false;
    }
    const allowed =
      canExpandIsland(unlockedRef.current, xpRef.current) || pendingExpandZoneRef.current === next.id;
    if (!allowed) {
      return false;
    }
    const nextIds = Array.from(new Set([...unlockedRef.current, next.id]));
    unlockedRef.current = nextIds;
    const seen = Array.from(new Set([...seenZoneUnlocksRef.current, next.id]));
    seenZoneUnlocksRef.current = seen;
    if (pendingExpandZoneRef.current === next.id) {
      pendingExpandZoneRef.current = null;
    }
    // busy 는 화산 연출 done(releaseIslandExpandAttempt) 때까지 유지한다.
    // 예전에 reveal 시점에 풀면, 배포 빌드에서 ash.block 오버레이보다 먼저
    // 키우기가 다시 열려 연타로 XP·확장이 중복된다.
    setUnlockedZones(nextIds);
    void updateIslandState((record) => ({
      ...record,
      seenZoneUnlocks: seen,
      unlockedZones: nextIds,
      pendingExpandZoneId: pendingExpandZoneRef.current,
    }));
    return true;
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
      if (pendingExpandZoneRef.current === zoneId) {
        pendingExpandZoneRef.current = null;
      }
      // 해금을 먼저 반영한 뒤 reveal를 닫아 타일이 깜빡이지 않게 함
      setUnlockedZones(nextIds);
      zoneUnlockRevealRef.current = null;
      void updateIslandState((record) => ({
        ...record,
        seenZoneUnlocks: seen,
        unlockedZones: nextIds,
        pendingExpandZoneId: pendingExpandZoneRef.current,
      }));
      return null;
    });
  }, []);

  const setHomeActive = useCallback(
    (active: boolean) => {
      homeActiveRef.current = active;
      if (active) {
        flushHomeReveals();
      }
    },
    [flushHomeReveals],
  );

  const dismissHomeInvite = useCallback(() => {
    setHomeInvite(null);
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
    setHomeInvite(null);
    growthRevealRef.current = null;
    zoneUnlockRevealRef.current = null;
    pendingGrowthLevelRef.current = null;
    pendingExpandZoneRef.current = null;
    islandExpandBusyRef.current = false;
    setIslandExpandBusy(false);
    lastSeenLevelRef.current = 1;
    setPendingPlaceItemId(null);
    setLastPlaced(null);
    setExploreRemaining(EXPLORE_DAILY_LIMIT);
    setExploreEndsAt(null);
    setExploreStartedAt(null);
    setExplorePendingDurationMs(null);
    setExploringGochiId(null);
    setPendingExploreGochiId(null);
    setExploreEggCount(0);
    setGochiEggs({});
    setNewGochiEggIds([]);
    setExploreEggReveal(null);
    lastSeenLevelRef.current = 1;
    seenZoneUnlocksRef.current = ['core'];
    xpRef.current = 0;
    waterRef.current = 0;
    unlockedRef.current = ['core'];
  }, []);

  const startExplore = useCallback(async (input: { gochiId: string; durationMs?: number }) => {
    if (!unlockedRef.current.includes(EXPLORE_FOREST_ZONE)) {
      return false;
    }
    const character = getExploreCharacter(input.gochiId as ExploreCharacterId);
    const ownedIds = ownedExploreCharacterIds(getGrowthStage(xpRef.current).level);
    if (!character || !ownsExploreCharacter(character.id, ownedIds)) {
      return false;
    }
    const durationMs =
      typeof input.durationMs === 'number' && input.durationMs > 0
        ? input.durationMs
        : EXPLORE_DURATION_MS;
    // 서버 주소가 없으면 local — 실패해도 로컬 파견은 진행
    await dispatchExploreTrip({
      gochiId: input.gochiId,
      durationMs,
    });
    const next = await startExploreTrip({ gochiId: input.gochiId, durationMs });
    if (!next) {
      return false;
    }
    applyExploreRecord(next);
    return true;
  }, [applyExploreRecord]);

  /** 섬 게임 intro→loop 때 호출. 소요 시간 카운트를 여기서 연다 */
  const markExploreEntered = useCallback(async () => {
    const next = await beginExploreClock();
    if (!next) {
      return;
    }
    applyExploreRecord(next);
  }, [applyExploreRecord]);

  /**
   * 숲 진입 신호(explore-entered)가 유실되면 타이머가 영구히 안 돈다.
   * intro(~3초)보다 여유 있게 기다린 뒤 강제 시작한다.
   */
  useEffect(() => {
    if (!exploringGochiId || explorePendingDurationMs == null || exploreEndsAt) {
      return;
    }
    const fallback = setTimeout(() => {
      void markExploreEntered();
    }, 4500);
    return () => clearTimeout(fallback);
  }, [exploreEndsAt, explorePendingDurationMs, exploringGochiId, markExploreEntered]);

  const claimExploreEgg = useCallback(async (options?: { eggId?: string }) => {
    const result = await claimExploreReward(options);
    if (!result) {
      return false;
    }
    setPendingExploreGochiId(null);
    const synced = await readExploreState();
    setGochiEggs(synced.eggs);
    setNewGochiEggIds(synced.newEggIds);
    setExploreEggCount(synced.eggCount);
    setExploreEggReveal({
      eggCount: result.eggCount,
      gochiId: result.gochiId,
      eggId: result.eggId,
      isNewType: result.isNewType,
    });
    return true;
  }, []);

  const acknowledgeExploreEggReveal = useCallback(() => {
    setExploreEggReveal(null);
  }, []);

  const markGochiEggDetailSeen = useCallback(async (eggId: string) => {
    const next = await markGochiEggSeen(eggId);
    setNewGochiEggIds(next.newEggIds);
    setGochiEggs(next.eggs);
    setExploreEggCount(next.eggCount);
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
      growLocked,
      islandExpandBusy,
      growthReveal,
      zoneUnlockReveal,
      homeInvite,
      homeExpandSignal,
      certificationPhotoUri,
      pendingCertification,
      owned,
      placed,
      unlockedZones,
      pendingPlaceItemId,
      lastPlaced,
      exploreForestUnlocked,
      exploreRemaining,
      exploreDailyLimit: EXPLORE_DAILY_LIMIT,
      exploreEndsAt,
      exploreStartedAt,
      exploreProgress: exploreProgressValue,
      exploringGochiId,
      isExploring,
      isExploreEntering,
      hasExploreReward,
      pendingExploreGochiId,
      exploreEggCount,
      gochiEggs,
      newGochiEggIds,
      exploreEggReveal,
      canStartExplore,
      exploreRemainLabel,
      startExplore,
      markExploreEntered,
      claimExploreEgg,
      acknowledgeExploreEggReveal,
      markGochiEggDetailSeen,
      syncExplore,
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
      addCoins: (amount) => {
        const nextCoins = coins + amount;
        setCoins(nextCoins);
        void updateIslandState((current) => ({ ...current, coins: nextCoins }));
      },
      addXp: async (amount) => {
        await applyXpGain(amount);
      },
      petCreature,
      growCreature,
      expandIsland,
      revealExpandedZone,
      acknowledgeGrowthReveal,
      acknowledgeZoneUnlock,
      setHomeActive,
      dismissHomeInvite,
      releaseIslandExpandAttempt,
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
        setOxygen(drops.oxygen);
        setWater(0);
        waterRef.current = 0;
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
      growLocked,
      islandExpandBusy,
      growthReveal,
      zoneUnlockReveal,
      homeInvite,
      homeExpandSignal,
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
      revealExpandedZone,
      acknowledgeGrowthReveal,
      acknowledgeZoneUnlock,
      setHomeActive,
      dismissHomeInvite,
      releaseIslandExpandAttempt,
      applyXpGain,
      resetLocalData,
      exploreForestUnlocked,
      exploreRemaining,
      exploreEndsAt,
      exploreStartedAt,
      exploreProgressValue,
      exploringGochiId,
      isExploring,
      isExploreEntering,
      hasExploreReward,
      pendingExploreGochiId,
      exploreEggCount,
      gochiEggs,
      newGochiEggIds,
      exploreEggReveal,
      canStartExplore,
      exploreRemainLabel,
      startExplore,
      markExploreEntered,
      claimExploreEgg,
      acknowledgeExploreEggReveal,
      markGochiEggDetailSeen,
      syncExplore,
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
