import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { usePlayState } from '@/components/play-state';
import { uiBongging, uiCamera } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';
import { createBonggingSubmission, submitBonggingCertification } from '@/lib/bongging-certification';
import { isBonggingDailyLimitReached, markBonggingCertified } from '@/lib/bongging-daily';
import { recognitionErrorMessage, recognizeTrash } from '@/lib/bongging-recognition';
import { localFailureVerification, toBonggingVerification, type BonggingVerification } from '@/lib/bongging-reward';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type Recognition = { verification: BonggingVerification } | { error: unknown };
type Phase = 'boot' | 'limit' | 'analysis' | 'found' | 'reward' | 'failure';

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
 * 촬영 후 한 흐름: 한도 → 분석 로딩 → (제미나이 성공 시 초록 found) → 보상/실패 팝업
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
  const recognition = useRef<Promise<Recognition> | null>(null);
  const ranRef = useRef(false);

  const cancelAnalysis = useCallback(() => {
    cancelBonggingCertification();
    router.back();
  }, [cancelBonggingCertification]);

  const retryCapture = useCallback(() => {
    cancelBonggingCertification();
    router.replace('/camera');
  }, [cancelBonggingCertification]);

  const goHome = useCallback(() => {
    router.replace('/(tabs)');
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!pendingCertification) {
      setPhase('failure');
      return;
    }
    setPhase('analysis');
    setAnalysisError(null);
    recognition.current ??= startRecognition(pendingCertification.imageUri);
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
      // 옵션 B: 제미나이가 쓰레기를 찾은 뒤에만 초록 코너
      setPhase('found');
    } catch {
      setAnalysisError('인증 정보를 만들지 못했어요. 다시 시도해 주세요.');
      setPhase('failure');
    }
  }, [finishBonggingCertification, pendingCertification]);

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
      if (await isBonggingDailyLimitReached()) {
        setPhase('limit');
        return;
      }
      recognition.current = startRecognition(pendingImageUri);
      await runAnalysis();
    })();
  }, [pendingImageUri, runAnalysis]);

  useEffect(() => {
    if (phase !== 'found') {
      return;
    }
    const timer = setTimeout(() => setPhase('reward'), 850);
    return () => clearTimeout(timer);
  }, [phase]);

  const popupWidth = Math.min(width - scale(40), scale(300));
  const showFoundFrame = phase === 'found' || phase === 'reward';
  const dimmed = phase === 'reward' || phase === 'failure' || phase === 'limit';

  return (
    <View style={{ flex: 1, backgroundColor: '#1A171F' }}>
      <StatusBar style="light" />
      {photo ? (
        <Image source={photo} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} contentFit="cover" />
      ) : null}
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: dimmed ? 'rgba(26,23,31,0.62)' : 'rgba(26,23,31,0.28)',
        }}
      />

      <View style={{ flex: 1, paddingTop: insets.top + scale(8), paddingBottom: Math.max(insets.bottom, scale(12)) }}>
        <View style={{ paddingHorizontal: scale(16), flexDirection: 'row', alignItems: 'center' }}>
          <AssetImageButton source={uiBongging.close} label="닫기" width={32} height={32} onPress={cancelAnalysis} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Image source={uiBongging.tag} style={{ width: scale(88), height: scale(28), ...pixelImageStyle }} contentFit="contain" />
          </View>
          <View style={{ width: scale(32) }} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(20) }}>
          {phase === 'analysis' ? (
            <Image
              source={uiBongging.loading}
              style={{ width: scale(180), height: scale(138), ...pixelImageStyle }}
              contentFit="contain"
            />
          ) : null}

          {showFoundFrame ? (
            <View style={{ width: scale(260), height: scale(260), alignItems: 'center', justifyContent: 'center' }}>
              {photo ? (
                <Image
                  source={photo}
                  style={{ width: scale(220), height: scale(220), borderRadius: scale(6) }}
                  contentFit="cover"
                />
              ) : null}
              <Image
                source={uiCamera.cornersFound}
                style={{ position: 'absolute', width: scale(260), height: scale(260), ...pixelImageStyle }}
                contentFit="contain"
              />
            </View>
          ) : null}

          {phase === 'failure' && photo && !analysisError ? (
            <View style={{ width: scale(220), height: scale(220), marginBottom: scale(12), alignItems: 'center', justifyContent: 'center' }}>
              <Image source={photo} style={{ width: scale(180), height: scale(180), borderRadius: scale(6) }} contentFit="cover" />
              <Image
                source={uiBongging.photoFrame}
                style={{ position: 'absolute', width: scale(220), height: scale(220), ...pixelImageStyle }}
                contentFit="contain"
              />
            </View>
          ) : null}

          {phase === 'reward' ? (
            <BakedPopup
              source={uiBongging.popupReward}
              width={popupWidth}
              aspect={316 / 352}
              leftLabel="한 번 더"
              rightLabel="섬 보러 가기"
              onLeft={retryCapture}
              onRight={goHome}
            />
          ) : null}

          {phase === 'failure' ? (
            <BakedPopup
              source={uiBongging.popupFail}
              width={popupWidth * 0.92}
              aspect={0.78}
              centerLabel={analysisError ? '다시 찍기' : '다시 찍기'}
              onCenter={retryCapture}
              accessibilityHint={analysisError ?? verification?.message ?? localFailureVerification.message}
            />
          ) : null}

          {phase === 'limit' ? (
            <BakedPopup
              source={uiBongging.popupLimit}
              width={popupWidth * 0.92}
              aspect={0.72}
              centerLabel="알았수다"
              onCenter={goHome}
            />
          ) : null}
        </View>
      </View>
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
    <View
      accessibilityHint={accessibilityHint}
      style={{ width, height, ...pixelImageStyle }}>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={leftLabel}
            onPress={onLeft}
            style={{ flex: 1 }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightLabel}
            onPress={onRight}
            style={{ flex: 1 }}
          />
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
