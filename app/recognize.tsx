import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { usePlayState } from '@/components/play-state';
import { gachiUi, galmuri } from '@/constants/gachi-ui';
import { uiBongging, uiCamera } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';
import { createBonggingSubmission, submitBonggingCertification } from '@/lib/bongging-certification';
import { isBonggingDailyLimitReached, markBonggingCertified } from '@/lib/bongging-daily';
import { recognitionErrorMessage, recognizeTrash } from '@/lib/bongging-recognition';
import { localFailureVerification, toBonggingVerification, type BonggingVerification } from '@/lib/bongging-reward';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

/** 와프 확인중 화면 배경 */
const CREAM_BG = gachiUi.cream;

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
    // replace('/camera') 하면 카메라가 스택에 쌓여 닫기 때 카메라가 반복된다
    if (router.canGoBack()) {
      router.back();
      return;
    }
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
  /** 와프: 확인중·실패·한도는 크림 배경 */
  const creamPhase = phase === 'analysis' || phase === 'failure' || phase === 'limit' || phase === 'boot';
  const statusStyle = creamPhase ? 'dark' : 'light';

  return (
    <View style={{ flex: 1, backgroundColor: creamPhase ? CREAM_BG : '#1A171F' }}>
      <StatusBar style={statusStyle} />

      {!creamPhase && photo ? (
        <Image source={photo} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} contentFit="cover" />
      ) : null}
      {!creamPhase ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: phase === 'reward' ? 'rgba(26,23,31,0.55)' : 'rgba(26,23,31,0.28)',
          }}
        />
      ) : null}

      <View style={{ flex: 1, paddingTop: insets.top + scale(8), paddingBottom: Math.max(insets.bottom, scale(12)) }}>
        {phase === 'analysis' ? null : (
          <View style={{ paddingHorizontal: scale(16), flexDirection: 'row', alignItems: 'center' }}>
            <AssetImageButton
              source={uiBongging.close}
              label="닫기"
              width={36}
              height={40}
              onPress={phase === 'limit' ? goHome : cancelAnalysis}
            />
            <View style={{ flex: 1 }} />
            <View style={{ width: scale(36) }} />
          </View>
        )}

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(20) }}>
          {phase === 'analysis' ? (
            <AnalysisLoading onCancel={cancelAnalysis} />
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

          {phase === 'failure' && photo ? (
            <View
              style={{
                width: scale(240),
                height: scale(240),
                marginBottom: scale(16),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Image source={photo} style={{ width: scale(196), height: scale(196), borderRadius: scale(4) }} contentFit="cover" />
              <Image
                source={uiBongging.photoFrame}
                style={{ position: 'absolute', width: scale(240), height: scale(240), ...pixelImageStyle }}
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
              centerLabel="다시 찍기"
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

/** 와프 p-16: 크림 배경 + 귤새 로딩 + 초록 점 루프 */
function AnalysisLoading({ onCancel }: { onCancel: () => void }) {
  const { scale, width } = useResponsive();
  const insets = useSafeAreaInsets();
  const artWidth = Math.min(scale(220), width - scale(48));
  const artHeight = artWidth * (184 / 240);
  // 에셋의 흰 글씨·고정 점은 크림에서 안 보이므로 캐릭터만 남긴다
  const clipHeight = artHeight * 0.58;

  return (
    <View style={{ flex: 1, width: '100%', alignItems: 'center' }}>
      <View style={{ position: 'absolute', top: 0, left: scale(16) }}>
        <AssetImageButton source={uiBongging.close} label="닫기" width={36} height={40} onPress={onCancel} />
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

/** 에셋 로딩 문구처럼 밝은 글자 + 검정 테두리 */
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

/** 왼쪽→오른쪽 초록 점이 순회하는 진행 표시 */
function LoadingDots() {
  const { scale } = useResponsive();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % 3);
    }, 320);
    return () => clearInterval(timer);
  }, []);

  const size = scale(10);
  const gap = scale(8);

  return (
    <View
      accessibilityLabel="확인 진행 중"
      style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {[0, 1, 2].map((index) => (
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
    <View accessibilityHint={accessibilityHint} style={{ width, height, ...pixelImageStyle }}>
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
