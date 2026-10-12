import type { WalkingDrops } from '@/constants/walking-reward';

// [TODO: 백엔드 연동] 서버 주소가 정해지면 여기에 넣는다. 예: 'https://api.example.com'
// 비어 있으면 서버로 아무것도 보내지 않고, 지금처럼 기기 저장 방식(lib/walking-reward.ts)으로만 동작한다.
const WALKING_API_BASE_URL: string = '';

// [TODO: 백엔드 연동] 경로는 임시다. 백엔드 담당과 확정한다. (봉그깅은 '/bongging/certifications'를 쓴다.)
export const WALKING_RECORD_PATH = '/walking/records';

const REQUEST_TIMEOUT_MS = 10000;

// 걸음 데이터가 어디서 왔는지. 지금은 가짜 값이라 항상 'mock'이다.
export type WalkingDataSource = 'mock' | 'healthkit' | 'healthconnect';

// ───────────── 백엔드 담당에게 전달할 요청/응답 예시 ─────────────
//
// POST {서버 주소}/walking/records
// Content-Type: application/json
//
// 요청 본문
// {
//   "date": "2026-10-12",                    // 기기 기준 날짜 (YYYY-MM-DD)
//   "steps": 3200,                           // 그날 0시부터 지금까지의 누적 걸음 수 (늘어난 만큼이 아니라 전체)
//   "distanceMeters": 2240,                  // 그날 누적 거리 (m, 정수)
//   "source": "mock",                        // "mock" | "healthkit" | "healthconnect"
//   "syncedAt": "2026-10-12T05:30:00.000Z"   // 보내는 시각 (ISO 8601, UTC)
// }
//
// 응답 본문 (200)
// {
//   "reward": { "oxygen": 8, "water": 5 },   // 이번 요청으로 새로 지급된 보상. 없으면 null
//   "claimedSteps": [1000, 3000]             // 그날 이미 보상을 받은 단계(걸음 수 기준값) 전체 목록
// }
//
// 서버에 부탁할 동작
// - 같은 날짜로 여러 번 보내도 각 단계 보상은 하루에 한 번만 지급한다. (앱은 걸음 수가 바뀔 때마다 보낸다.)
// - 한 번에 여러 단계를 넘었으면 reward에 합쳐서 돌려준다.
//
// 아직 정해지지 않은 것
// - 사용자 구분 방법(로그인·토큰). 지금 앱에는 로그인이 없어서 요청에 사용자 정보를 싣지 않는다.
// - 단계 기준(1,000/3,000/5,000보)과 보상 개수를 서버와 앱 중 어디서 관리할지.
// - 지금까지 모은 방울 총합도 응답에 넣을지.
// ────────────────────────────────────────────────────────────────

export type WalkingRecordRequest = {
  date: string;
  steps: number;
  distanceMeters: number;
  source: WalkingDataSource;
  syncedAt: string;
};

export type WalkingRecordResponse = {
  reward: WalkingDrops | null;
  claimedSteps: number[];
};

export type WalkingRecordResult =
  // 서버 주소가 없어서 보내지 않았다. 기기 저장 방식으로 동작하면 된다.
  | { mode: 'local' }
  // 서버로 보냈고 응답을 받았다.
  | { mode: 'server'; ok: true; data: WalkingRecordResponse }
  // 서버로 보냈지만 실패했다. (연결 실패, 시간 초과, 서버 오류, 알 수 없는 응답 모양)
  | { mode: 'server'; ok: false };

// 걸음 기록을 서버로 보낸다. 어떤 경우에도 오류를 던지지 않고 결과만 돌려준다.
export async function sendWalkingRecord(record: Omit<WalkingRecordRequest, 'syncedAt'>): Promise<WalkingRecordResult> {
  if (!WALKING_API_BASE_URL) {
    return { mode: 'local' };
  }

  const body: WalkingRecordRequest = { ...record, syncedAt: new Date().toISOString() };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${WALKING_API_BASE_URL}${WALKING_RECORD_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { mode: 'server', ok: false };
    }
    const data = parseResponse(await response.json());
    return data ? { mode: 'server', ok: true, data } : { mode: 'server', ok: false };
  } catch {
    return { mode: 'server', ok: false };
  } finally {
    clearTimeout(timer);
  }
}

// 서버 응답이 약속한 모양인지 확인한다. 모양이 다르면 null.
function parseResponse(value: unknown): WalkingRecordResponse | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const { reward, claimedSteps } = value as { reward?: unknown; claimedSteps?: unknown };
  if (!Array.isArray(claimedSteps) || !claimedSteps.every((step) => typeof step === 'number')) {
    return null;
  }
  if (reward == null) {
    return { reward: null, claimedSteps };
  }
  const { oxygen, water } = reward as { oxygen?: unknown; water?: unknown };
  if (typeof oxygen !== 'number' || typeof water !== 'number') {
    return null;
  }
  return { reward: { oxygen, water }, claimedSteps };
}
