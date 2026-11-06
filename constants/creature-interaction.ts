/** 쓰다듬기·성장 연출 상수. 기획 확정 전 임시값. */

/** 쓰담 스트로크가 이만큼 모이면 XP 지급 */
export const PET_STROKES_REQUIRED = 3;

/** 스트로크 1세션 완료 시 얻는 경험치 */
export const PET_XP_REWARD = 3;

/** 한 번의 쓰담으로 인정할 최소 이동 거리(pt) */
export const PET_STROKE_MIN_DISTANCE = 36;

/** 스트로크 사이 간격이 이보다 길면 카운트 리셋(ms) */
export const PET_STROKE_IDLE_MS = 2500;

/** 성장 progress에 XP를 더할 때 나눗수. XP 3(=쓰담 1회) ≈ progress +1 */
export const XP_TO_PROGRESS_DIVISOR = 3;
