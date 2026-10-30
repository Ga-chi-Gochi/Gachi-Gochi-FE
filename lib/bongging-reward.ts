export const XP_PER_TRASH = 10;
export const GROWTH_PER_TRASH = 1;

export type BonggingItem = { name: string; count: number; confidence: number };

export type BonggingVerification = {
  status: 'success' | 'failure';
  items: BonggingItem[];
  xp: number;
  growthStacks: number;
  message: string;
};

export const localFailureVerification: BonggingVerification = {
  status: 'failure',
  items: [],
  xp: 0,
  growthStacks: 0,
  message: '이번 사진에서는 쓰레기를 확인하지 못했어요.',
};

// 찾은 쓰레기 개수만큼 경험치와 섬 성장을 준다. 하나도 없으면 실패다.
export function toBonggingVerification(items: BonggingItem[]): BonggingVerification {
  const total = countTrash(items);
  if (total === 0) {
    return localFailureVerification;
  }

  const names = items.map((item) => item.name).join(', ');
  return {
    status: 'success',
    items,
    xp: total * XP_PER_TRASH,
    growthStacks: total * GROWTH_PER_TRASH,
    message: `${names}${objectParticle(names)} 확인했어요.`,
  };
}

export function countTrash(items: BonggingItem[]) {
  return items.reduce((sum, item) => sum + item.count, 0);
}

// 마지막 글자에 받침이 있으면 '을', 없으면 '를'. 한글이 아니면 둘 다 적는다.
function objectParticle(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) {
    return '을(를)';
  }
  return code % 28 === 0 ? '를' : '을';
}
