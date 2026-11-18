/**
 * 화면 '?' 버튼용 기능별 도움말 콘텐츠.
 * topic(기능 ID) ↔ 설명 텍스트만 매핑한다. UI 는 FeatureHelpOverlay 가 읽는다.
 */

/** 도움말이 있는 기능 ID. 화면·오버레이에서 이 값만 넘긴다. */
export type FeatureHelpTopic = 'home' | 'bongging' | 'walking';

/** 한 기능의 도움말 본문. 텍스트만 둔다 (이미지·단계형은 나중에 확장). */
export type FeatureHelpContent = {
  /** FeatureHelpTopic 과 동일. 목록에서 찾기 쉽게 필드에도 둔다. */
  id: FeatureHelpTopic;
  title: string;
  /** 번호 목록으로 보여줄 한 줄 설명들 */
  lines: readonly string[];
};

/**
 * 기능별 도움말 원본 목록.
 * 새 기능을 넣을 때 여기 항목만 추가한 뒤 FeatureHelpTopic 유니온에 ID 를 더한다.
 */
export const FEATURE_HELP_LIST: readonly FeatureHelpContent[] = [
  {
    id: 'home',
    title: '섬에서는 이렇게 해요',
    lines: [
      '고치를 키우고 섬을 둘러볼 수 있어요',
      '오른쪽 아래 나침반으로 봉그깅·걷기·상점을 열어요',
      '오른쪽 위 메뉴·상점·도감에서 더 많은 기능을 봐요',
      '경험치가 쌓이면 고치가 자라요',
    ],
  },
  {
    id: 'bongging',
    title: '봉그깅은 이렇게 해요',
    lines: ['쓰레기를 사진으로 찍어 인증해요', '인증하면 경험치를 얻어요', '경험치가 쌓이면 고치가 자라요'],
  },
  {
    id: 'walking',
    title: '걷기는 이렇게 해요',
    lines: ['걸을수록 단계마다 귤과 경험치를 받아요', '받은 단계는 다음 날 다시 받을 수 있어요', '경험치가 쌓이면 고치가 자라요'],
  },
] as const;

/** topic → 콘텐츠. Overlay·화면에서 바로 쓸 때 */
export const FEATURE_HELP: Record<FeatureHelpTopic, FeatureHelpContent> = Object.fromEntries(
  FEATURE_HELP_LIST.map((item) => [item.id, item]),
) as Record<FeatureHelpTopic, FeatureHelpContent>;

/** 기능 ID 로 도움말을 가져온다. 없는 ID 는 컴파일 단계에서 막힌다. */
export function getFeatureHelp(topic: FeatureHelpTopic): FeatureHelpContent {
  return FEATURE_HELP[topic];
}

/** 등록된 기능 ID 인지 확인한다. 동적 문자열을 받을 때 쓴다. */
export function isFeatureHelpTopic(value: string): value is FeatureHelpTopic {
  return value in FEATURE_HELP;
}

/** @deprecated FeatureHelpContent 를 쓰세요. 예전 이름 호환용 */
export type FeatureHelp = FeatureHelpContent;
