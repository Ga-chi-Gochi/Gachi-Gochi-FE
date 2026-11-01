/**
 * [TODO: 백엔드 연동] 서버 주소가 정해지면 여기에 넣는다.
 * 비어 있으면 로컬(AsyncStorage)만으로 탐험을 시작한다.
 */
const EXPLORE_API_BASE_URL: string = '';

export const EXPLORE_DISPATCH_PATH = '/explore/trips';

const REQUEST_TIMEOUT_MS = 10000;

export type ExploreDispatchRequest = {
  gochiId: string;
  durationMs: number;
  dispatchedAt: string;
};

export type ExploreDispatchResponse = {
  tripId: string;
  endsAt: string;
};

export type ExploreDispatchResult =
  | { mode: 'local' }
  | { mode: 'server'; ok: true; data: ExploreDispatchResponse }
  | { mode: 'server'; ok: false };

/** 탐험 파견. 서버 주소가 없으면 local로 성공 처리한다. */
export async function dispatchExploreTrip(
  record: Omit<ExploreDispatchRequest, 'dispatchedAt'>,
): Promise<ExploreDispatchResult> {
  if (!EXPLORE_API_BASE_URL) {
    return { mode: 'local' };
  }

  const body: ExploreDispatchRequest = { ...record, dispatchedAt: new Date().toISOString() };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${EXPLORE_API_BASE_URL}${EXPLORE_DISPATCH_PATH}`, {
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

function parseResponse(value: unknown): ExploreDispatchResponse | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const { tripId, endsAt } = value as { tripId?: unknown; endsAt?: unknown };
  if (typeof tripId !== 'string' || typeof endsAt !== 'string') {
    return null;
  }
  return { tripId, endsAt };
}
