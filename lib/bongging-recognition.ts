import { GoogleGenAI } from '@google/genai';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { BonggingItem } from '@/lib/bongging-reward';

// gemini-3.8-flash는 무료 등급에서 자주 붐벼서(503) 응답이 없을 때가 많았다.
const MODEL = 'gemini-3.5-flash-lite';

// 이 시간 안에 답이 없으면 실패로 보고 '다시 시도'를 띄운다.
const REQUEST_TIMEOUT_MS = 30000;

// 긴 변 기준으로 이보다 크면 줄여서 보낸다. 사진이 작을수록 토큰과 업로드 시간이 준다.
const MAX_IMAGE_SIDE = 1280;

const SYSTEM_PROMPT = `너는 쓰레기 줍기(플로깅) 인증 앱의 판별기야. 사용자가 보낸 사진에서 주운 쓰레기나 바닥에 버려진 쓰레기를 찾아.
- 쓰레기가 아닌 것(사람, 손, 풍경, 쓰레기통 자체, 아직 쓰고 있는 물건)은 세지 않아.
- 같은 품목은 하나로 묶고 count에 개수를 적어.
- name은 짧은 한국어 품목 이름으로 적어. 예: 플라스틱 병, 캔, 과자 봉지, 담배꽁초, 종이컵.
- confidence는 그 품목이 쓰레기라고 확신하는 정도를 0~100 정수로 적어.
- 쓰레기가 없거나 사진을 알아볼 수 없으면 items를 빈 배열로 둬.`;

const TRASH_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'integer' },
          confidence: { type: 'integer' },
        },
        required: ['name', 'count', 'confidence'],
      },
    },
  },
  required: ['items'],
};

export class MissingApiKeyError extends Error {}

let client: GoogleGenAI | null = null;

// 앱에서 Gemini를 바로 부른다. EXPO_PUBLIC_ 값은 앱 파일에 그대로 들어가므로 이 키는 누구나 꺼낼 수 있다.
// 테스트용으로만 쓰고, 배포 전에는 서버를 거치게 바꾼다.
// 무료 등급에서는 보낸 사진이 구글 제품 개선에 쓰일 수 있다.
function getClient() {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError('EXPO_PUBLIC_GEMINI_API_KEY is not set');
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export async function recognizeTrash(imageUri: string): Promise<BonggingItem[]> {
  const image = await toJpegBase64(imageUri);
  const interaction = await getClient().interactions.create(
    {
      model: MODEL,
      // 한 번 묻고 끝나는 요청이라 구글 서버에 대화 기록을 남기지 않는다.
      store: false,
      system_instruction: SYSTEM_PROMPT,
      generation_config: { thinking_level: 'low' },
      response_format: { type: 'text', mime_type: 'application/json', schema: TRASH_SCHEMA },
      input: [
        { type: 'text', text: '이 사진에 있는 쓰레기를 찾아줘.' },
        { type: 'image', data: image, mime_type: 'image/jpeg' },
      ],
    },
    // SDK 자동 재시도는 끈다. 503 뒤 재시도하면 상태 코드 없는 'unusable' 오류로 바뀌어 원인을 알 수 없었다.
    // 대신 실패하면 화면의 '다시 시도'로 사용자가 다시 보낸다.
    { timeout_ms: REQUEST_TIMEOUT_MS, retries: { strategy: 'none' } },
  );

  const text = interaction.output_text;
  if (!text) {
    throw new Error('Recognition response had no text');
  }
  const parsed = JSON.parse(text) as { items?: BonggingItem[] };
  return (parsed.items ?? [])
    .map((item) => ({
      name: String(item.name ?? '').trim(),
      count: Math.max(0, Math.round(Number(item.count) || 0)),
      confidence: Math.min(100, Math.max(0, Math.round(Number(item.confidence) || 0))),
    }))
    .filter((item) => item.name.length > 0 && item.count > 0);
}

export function recognitionErrorMessage(error: unknown) {
  if (__DEV__) {
    console.warn('[bongging] recognition failed', error);
  }
  if (error instanceof MissingApiKeyError) {
    return 'Gemini API 키가 없어요. .env를 확인해 주세요.';
  }
  const status = httpStatus(error);
  if (status === 401 || status === 403) {
    return 'Gemini API 키가 올바르지 않아요.';
  }
  if (status === 429) {
    return '무료 사용량을 넘었어요. 잠시 후 다시 시도해 주세요.';
  }
  if (status === 503) {
    return '지금 분석 서버가 붐벼요. 잠시 후 다시 시도해 주세요.';
  }
  if (status === undefined && isTimeoutError(error)) {
    return '분석이 오래 걸려요. 다시 시도해 주세요.';
  }
  if (status === undefined && isNetworkError(error)) {
    return '인터넷 연결을 확인하고 다시 시도해 주세요.';
  }
  return '쓰레기를 분석하지 못했어요. 다시 시도해 주세요.';
}

// SDK 오류 클래스가 밖으로 공개돼 있지 않아서 상태 코드 필드로 구분한다.
function httpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  if (typeof status === 'number') {
    return status;
  }
  return typeof statusCode === 'number' ? statusCode : undefined;
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && /timeout/i.test(error.name);
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError || (error instanceof Error && /connection|network/i.test(error.name));
}

async function toJpegBase64(uri: string) {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const landscape = original.width >= original.height;
  const image =
    Math.max(original.width, original.height) > MAX_IMAGE_SIDE
      ? await ImageManipulator.manipulate(original)
          .resize(landscape ? { width: MAX_IMAGE_SIDE, height: null } : { width: null, height: MAX_IMAGE_SIDE })
          .renderAsync()
      : original;
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) {
    throw new Error('Could not read photo as base64');
  }
  return saved.base64;
}
