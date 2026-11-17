/** 화면 안 '?' 버튼으로 다시 볼 수 있는 기능별 도움말 */
export type FeatureHelpTopic = 'home' | 'bongging' | 'walking';

export type FeatureHelp = { title: string; lines: string[] };

export const FEATURE_HELP: Record<FeatureHelpTopic, FeatureHelp> = {
  home: {
    title: '섬에서는 이렇게 해요',
    lines: [
      '고치를 키우고 섬을 둘러볼 수 있어요',
      '오른쪽 아래 나침반으로 봉그깅·걷기·상점을 열어요',
      '오른쪽 위 메뉴·상점·도감에서 더 많은 기능을 봐요',
      '경험치가 쌓이면 고치가 자라요',
    ],
  },
  bongging: {
    title: '봉그깅은 이렇게 해요',
    lines: ['쓰레기를 사진으로 찍어 인증해요', '인증하면 경험치를 얻어요', '경험치가 쌓이면 고치가 자라요'],
  },
  walking: {
    title: '걷기는 이렇게 해요',
    lines: ['걸을수록 단계마다 귤과 경험치를 받아요', '받은 단계는 다음 날 다시 받을 수 있어요', '경험치가 쌓이면 고치가 자라요'],
  },
};
