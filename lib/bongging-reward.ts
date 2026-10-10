export type BonggingVerification = {
  status: 'success' | 'failure';
  items: { name: string; confidence: number }[];
  xp: number;
  growthStacks: number;
  message: string;
};

export const localSuccessVerification: BonggingVerification = {
  status: 'success',
  items: [
    { name: '플라스틱 병', confidence: 92 },
    { name: '과자 봉지', confidence: 88 },
  ],
  xp: 20,
  growthStacks: 1,
  message: '플라스틱 병, 과자 봉지를 확인했어요.',
};

export const localFailureVerification: BonggingVerification = {
  status: 'failure',
  items: [],
  xp: 0,
  growthStacks: 0,
  message: '이번 사진에서는 쓰레기를 확인하지 못했어요.',
};
