import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { GachiIconButton } from '@/components/gachi-ui/gachi-button';
import { IslandGame, NO_ASH, type IslandAsh, type IslandCameraState } from '@/components/island/island-game';
import { VolcanoEruptionProvider } from '@/components/island/volcano-eruption';
import { usePlayState } from '@/components/play-state';
import { gachiUi, galmuri } from '@/constants/gachi-ui';
import { ISLAND_HOME } from '@/constants/routes';
import { uiBongging } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';
import { createBonggingSubmission, submitBonggingCertification } from '@/lib/bongging-certification';
import {
  BONGGING_DAILY_LIMIT,
  isBonggingDailyLimitReached,
  markBonggingCertified,
  readBonggingDailyCount,
} from '@/lib/bongging-daily';
import { recognitionErrorMessage, recognizeTrash } from '@/lib/bongging-recognition';
import { localFailureVerification, toBonggingVerification, type BonggingVerification } from '@/lib/bongging-reward';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;
const CREAM_BG = gachiUi.cream;

type Recognition = { verification: BonggingVerification } | { error: unknown };
/** confirm: 와프 인증 확인 → analysis → reward/failure/limit */
type Phase = 'boot' | 'confirm' | 'limit' | 'analysis' | 'reward' | 'failure';

function startRecognition(imageUri: string): Promise<Recognition> {
  return recognizeTrash(imageUri).then(
    (items) => ({ verification: toBonggingVerification(items) }),
    (error: unknown) => ({ error }),
  );
}

function toImageUri(uri: string) {
  if (
    uri.startsWith('file:') ||
    uri.startsWith('content:') ||
    uri.startsWith('ph:') ||
    uri.startsWith('assets-library:') ||
    uri.startsWith('blob:') ||
    uri.startsWith('data:') ||
    uri.startsWith('http')
  ) {
    return uri;
  }
  return `data:image/jpeg;base64,${uri}`;
}

/**
 * 촬영 후 흐름 (개선 와프)
 * 확인 → 로딩 → 보상/실패/한도 (결과는 섬 배경 위 팝업)
 */
export default function RecognizeScreen() {
  const { scale, width } = useResponsive();
  const insets = useSafeAreaInsets();
  const { pendingCertification, finishBonggingCertification, cancelBonggingCertification } = usePlayState();
  const pendingImageUri = pendingCertification?.imageUri ?? null;
  const [photoUri, setPhotoUri] = useState(pendingImageUri);
  if (pendingImageUri && pendingImageUri !== photoUri) {
    setPhotoUri(pendingImageUri);
  }
  const photo = photoUri ? { uri: toImageUri(photoUri) } : null;

  const [phase, setPhase] = useState<Phase>('boot');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [verification, setVerification] = useState<BonggingVerification | null>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const recognition = useRef<Promise<Recognition> | null>(null);
  const ranRef = useRef(false);

  const cancelAnalysis = useCallback(() => {
    cancelBonggingCertification();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(ISLAND_HOME);
  }, [cancelBonggingCertification]);

  const retryCapture = useCallback(() => {
    cancelBonggingCertification();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/camera');
  }, [cancelBonggingCertification]);

  const goHome = useCallback(() => {
    cancelBonggingCertification();
    router.replace(ISLAND_HOME);
  }, [cancelBonggingCertification]);

  const runAnalysis = useCallback(async () => {
    if (!pendingCertification || verifying) {
      return;
    }
    setVerifying(true);
    setPhase('analysis');
    setAnalysisError(null);
    recognition.current ??= startRecognition(pendingCertification.imageUri);
    try {
      const outcome = await recognition.current;
      if ('error' in outcome) {
        recognition.current = null;
        setAnalysisError(recognitionErrorMessage(outcome.error));
        setPhase('failure');
        return;
      }
      const next = outcome.verification;
      if (next.status === 'failure') {
        setVerification(next);
        setPhase('failure');
        return;
      }
      try {
        const submission = createBonggingSubmission({
          imageUri: pendingCertification.imageUri,
          fileName: pendingCertification.fileName,
          latitude: pendingCertification.latitude,
          longitude: pendingCertification.longitude,
          locationSource: pendingCertification.locationSource,
        });
        await submitBonggingCertification(submission);
        await markBonggingCertified();
        finishBonggingCertification({ xp: next.xp, growthStacks: next.growthStacks });
        setVerification(next);
        setPhase('reward');
      } catch {
        setAnalysisError('인증 정보를 만들지 못했어요. 다시 시도해 주세요.');
        setPhase('failure');
      }
    } finally {
      setVerifying(false);
    }
  }, [finishBonggingCertification, pendingCertification, verifying]);

  useEffect(() => {
    if (ranRef.current) {
      return;
    }
    ranRef.current = true;
    void (async () => {
      if (!pendingImageUri) {
        setPhase('failure');
        return;
      }
      const count = await readBonggingDailyCount();
      setDailyCount(count);
      if (await isBonggingDailyLimitReached()) {
        setPhase('limit');
        return;
      }
      setPhase('confirm');
    })();
  }, [pendingImageUri]);

  const popupWidth = Math.min(width - scale(40), scale(300));
  const creamPhase = phase === 'confirm' || phase === 'analysis' || phase === 'boot';
  const islandPhase = phase === 'reward' || phase === 'failure' || phase === 'limit';
  const statusStyle = creamPhase ? 'dark' : 'light';

  return (
    <View style={{ flex: 1, backgroundColor: creamPhase ? CREAM_BG : '#1C8481' }}>
      <StatusBar style={statusStyle} />

      {islandPhase ? (
        <VolcanoEruptionProvider>
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
            <IslandBackdrop />
          </View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(26,23,31,0.45)',
            }}
          />
        </VolcanoEruptionProvider>
      ) : null}

      <View style={{ flex: 1, paddingTop: insets.top + scale(8), paddingBottom: Math.max(insets.bottom, scale(12)) }}>
        {phase === 'analysis' ? null : (
          <View style={{ paddingHorizontal: scale(16), flexDirection: 'row', alignItems: 'center' }}>
            <GachiIconButton
              kind="squareBack"
              label="뒤로"
              size={32}
              onPress={phase === 'limit' || phase === 'reward' ? goHome : cancelAnalysis}
            />
            <View style={{ flex: 1 }} />
            <View style={{ width: scale(32) }} />
          </View>
        )}

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(20) }}>
          {phase === 'confirm' && photo ? (
            <ConfirmPanel
              photo={photo}
              dailyCount={dailyCount}
              verifying={verifying}
              onVerify={() => {
                void runAnalysis();
              }}
              onRetake={retryCapture}
            />
          ) : null}

          {phase === 'analysis' ? <AnalysisLoading onCancel={cancelAnalysis} /> : null}

          {phase === 'reward' ? (
            <View style={{ width: '100%', alignItems: 'center', gap: scale(14) }}>
              <Image
                source={uiBongging.toastClean}
                style={{ width: Math.min(width - scale(48), scale(280)), height: scale(34), ...pixelImageStyle }}
                contentFit="contain"
              />
              <BakedPopup
                source={uiBongging.popupReward}
                width={popupWidth}
                aspect={316 / 352}
                leftLabel="한 번 더"
                rightLabel="섬 보러 가기"
                onLeft={retryCapture}
                onRight={goHome}
              />
            </View>
          ) : null}

          {phase === 'failure' ? (
            <View style={{ width: '100%', alignItems: 'center', gap: scale(14) }}>
              <BakedPopup
                source={uiBongging.popupFail}
                width={popupWidth * 0.92}
                aspect={232 / 352}
                centerLabel="다시 찍기"
                onCenter={retryCapture}
                accessibilityHint={analysisError ?? verification?.message ?? localFailureVerification.message}
              />
              <View style={{ alignItems: 'center', gap: scale(10), marginTop: scale(4) }}>
                <AssetImageButton
                  source={uiBongging.verify}
                  label="인증하기"
                  width={170}
                  height={40}
                  onPress={() => {
                    recognition.current = null;
                    void runAnalysis();
                  }}
                />
                <AssetImageButton
                  source={uiBongging.retake}
                  label="다시 찍기"
                  width={148}
                  height={40}
                  onPress={retryCapture}
                />
              </View>
            </View>
          ) : null}

          {phase === 'limit' ? (
            <BakedPopup
              source={uiBongging.popupLimit}
              width={popupWidth * 0.92}
              aspect={200 / 352}
              centerLabel="알았수다"
              onCenter={goHome}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function IslandBackdrop() {
  const [, setCamera] = useState<IslandCameraState>({ zoom: 1, x: 0, y: 0, w: 0, h: 0 });
  const [, setAsh] = useState<IslandAsh>(NO_ASH);
  return (
    <IslandGame
      mode="preview"
      petOpen={false}
      onTapCreature={() => undefined}
      onCamera={setCamera}
      onAsh={setAsh}
    />
  );
}

/** 와프 3: 오늘 횟수 · 확인 말풍선 · 사진 프레임 · 인증/다시찍기 */
function ConfirmPanel({
  photo,
  dailyCount,
  verifying,
  onVerify,
  onRetake,
}: {
  photo: { uri: string };
  dailyCount: number;
  verifying: boolean;
  onVerify: () => void;
  onRetake: () => void;
}) {
  const { scale, width } = useResponsive();
  const frame = Math.min(scale(240), width - scale(64));
  const inner = frame * (196 / 240);
  const bubbleW = Math.min(scale(220), width - scale(64));

  return (
    <View style={{ width: '100%', alignItems: 'center', gap: scale(14) }}>
      <View
        style={{
          paddingHorizontal: scale(14),
          paddingVertical: scale(6),
          borderRadius: scale(12),
          backgroundColor: gachiUi.beige,
          borderWidth: scale(2),
          borderColor: gachiUi.ink,
        }}>
        <GalmuriText size={9} bold center>
          {`오늘 봉그깅 ${Math.min(dailyCount, BONGGING_DAILY_LIMIT)}/${BONGGING_DAILY_LIMIT}`}
        </GalmuriText>
      </View>

      <Image
        source={uiBongging.bubbleConfirm}
        style={{ width: bubbleW, height: bubbleW * (44 / 238), ...pixelImageStyle }}
        contentFit="contain"
      />

      <View style={{ width: frame, height: frame, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={photo} style={{ width: inner, height: inner, borderRadius: scale(4) }} contentFit="cover" />
        <Image
          source={uiBongging.photoFrame}
          style={{ position: 'absolute', width: frame, height: frame, ...pixelImageStyle }}
          contentFit="contain"
        />
      </View>

      <View style={{ alignItems: 'center', gap: scale(10), marginTop: scale(8) }}>
        <AssetImageButton
          source={uiBongging.verify}
          label={verifying ? '인증 중…' : '인증하기'}
          width={170}
          height={40}
          disabled={verifying}
          onPress={onVerify}
        />
        <AssetImageButton
          source={uiBongging.retake}
          label="다시 찍기"
          width={148}
          height={40}
          disabled={verifying}
          onPress={onRetake}
        />
      </View>
    </View>
  );
}

/** 와프 4: 크림 배경 + 귤새 로딩 + 점 */
function AnalysisLoading({ onCancel }: { onCancel: () => void }) {
  const { scale, width } = useResponsive();
  const insets = useSafeAreaInsets();
  const artWidth = Math.min(scale(220), width - scale(48));
  const artHeight = artWidth * (184 / 240);
  const clipHeight = artHeight * 0.58;

  return (
    <View style={{ flex: 1, width: '100%', alignItems: 'center' }}>
      <View style={{ position: 'absolute', top: 0, left: scale(16) }}>
        <GachiIconButton kind="squareBack" label="뒤로" size={32} onPress={onCancel} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(12) }}>
        <View style={{ width: artWidth, height: clipHeight, overflow: 'hidden', alignItems: 'center' }}>
          <Image
            source={uiBongging.loading}
            style={{ width: artWidth, height: artHeight, ...pixelImageStyle }}
            contentFit="contain"
          />
        </View>
        <OutlinedPixelText>확인하는 중이우다...</OutlinedPixelText>
        <LoadingDots />
      </View>

      <GalmuriText size={9} color={gachiUi.inkSoft} center style={{ marginBottom: Math.max(insets.bottom, scale(20)) }}>
        보통 5초 안에 끝나요
      </GalmuriText>
    </View>
  );
}

function OutlinedPixelText({ children }: { children: string }) {
  const { scale } = useResponsive();
  const fontSize = scale(14);
  const stroke = 1;
  const offsets = [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ] as const;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {offsets.map(([x, y]) => (
        <Text
          key={`${x},${y}`}
          style={{
            position: 'absolute',
            left: x * stroke,
            top: y * stroke,
            color: gachiUi.ink,
            fontSize,
            fontFamily: galmuri.size14,
            textAlign: 'center',
            includeFontPadding: false,
          }}>
          {children}
        </Text>
      ))}
      <Text
        style={{
          color: gachiUi.white,
          fontSize,
          fontFamily: galmuri.size14,
          textAlign: 'center',
          includeFontPadding: false,
        }}>
        {children}
      </Text>
    </View>
  );
}

function LoadingDots() {
  const { scale } = useResponsive();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % 6);
    }, 220);
    return () => clearInterval(timer);
  }, []);

  const size = scale(8);
  const gap = scale(6);

  return (
    <View accessibilityLabel="확인 진행 중" style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <View
          key={index}
          style={{
            width: size,
            height: size,
            backgroundColor: index === active ? gachiUi.green : gachiUi.beigeDeep,
            borderWidth: scale(1.5),
            borderColor: gachiUi.ink,
          }}
        />
      ))}
    </View>
  );
}

function BakedPopup({
  source,
  width,
  aspect,
  leftLabel,
  rightLabel,
  centerLabel,
  onLeft,
  onRight,
  onCenter,
  accessibilityHint,
}: {
  source: number;
  width: number;
  aspect: number;
  leftLabel?: string;
  rightLabel?: string;
  centerLabel?: string;
  onLeft?: () => void;
  onRight?: () => void;
  onCenter?: () => void;
  accessibilityHint?: string;
}) {
  const height = width * aspect;
  const hitTop = height * 0.72;
  const hitHeight = height * 0.22;

  return (
    <View accessibilityHint={accessibilityHint} style={{ width, height }}>
      <Image source={source} style={{ width, height, ...pixelImageStyle }} contentFit="contain" />
      {onLeft && onRight ? (
        <View
          style={{
            position: 'absolute',
            left: width * 0.08,
            right: width * 0.08,
            top: hitTop,
            height: hitHeight,
            flexDirection: 'row',
            gap: width * 0.04,
          }}>
          <Pressable accessibilityRole="button" accessibilityLabel={leftLabel} onPress={onLeft} style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel={rightLabel} onPress={onRight} style={{ flex: 1 }} />
        </View>
      ) : null}
      {onCenter ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={centerLabel}
          onPress={onCenter}
          style={{
            position: 'absolute',
            left: width * 0.18,
            right: width * 0.18,
            top: hitTop,
            height: hitHeight,
          }}
        />
      ) : null}
    </View>
  );
}
