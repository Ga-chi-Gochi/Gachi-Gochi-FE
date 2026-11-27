export type WearSlot = 'seat' | 'headRight' | 'headLeft' | 'face' | 'hat';

export type EquippedWear = Partial<Record<WearSlot, string>>;

export const WEAR_SLOT_OF: Record<string, WearSlot> = {
  nest: 'seat',
  ribbon: 'headRight',
  'flower-tangerine': 'headLeft',
  sunglasses: 'face',
  net: 'hat',
};

export const WEAR_SLOT_LABEL: Record<WearSlot, string> = {
  seat: '몸 아래',
  headRight: '머리 오른쪽',
  headLeft: '머리 왼쪽',
  face: '얼굴',
  hat: '모자',
};

export const WEAR_BACK_SLOTS: WearSlot[] = [];
export const WEAR_FRONT_SLOTS: WearSlot[] = ['seat', 'headRight', 'headLeft', 'face', 'hat'];
const ALL_SLOTS: WearSlot[] = [...WEAR_BACK_SLOTS, ...WEAR_FRONT_SLOTS];

export function wearSlotOf(itemId: string): WearSlot | null {
  return WEAR_SLOT_OF[itemId] ?? null;
}

export function isWearSlot(value: string): value is WearSlot {
  return (ALL_SLOTS as string[]).includes(value);
}

export function cleanEquipped(raw: unknown, owned: string[]): EquippedWear {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const next: EquippedWear = {};
  for (const [slot, itemId] of Object.entries(raw as Record<string, unknown>)) {
    if (!isWearSlot(slot) || typeof itemId !== 'string') {
      continue;
    }
    if (!owned.includes(itemId) || WEAR_SLOT_OF[itemId] !== slot) {
      continue;
    }
    next[slot] = itemId;
  }
  return next;
}

export function wearLayers(equipped: EquippedWear, preview?: string | null) {
  const merged: EquippedWear = { ...equipped };
  const previewSlot = preview ? wearSlotOf(preview) : null;
  if (preview && previewSlot) {
    merged[previewSlot] = preview;
  }
  const pick = (slots: WearSlot[]) => slots.map((slot) => merged[slot]).filter((id): id is string => typeof id === 'string');
  return { back: pick(WEAR_BACK_SLOTS), front: pick(WEAR_FRONT_SLOTS) };
}
