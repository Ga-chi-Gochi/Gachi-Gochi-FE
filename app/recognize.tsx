import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalysisSkeleton } from '@/components/analysis-skeleton';
import { FigButton } from '@/components/fig-button';
import { usePlayState } from '@/components/play-state';
import { RewardFanfare } from '@/components/reward-fanfare';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';
import { createBonggingSubmission, submitBonggingCertification } from '@/lib/bongging-certification';
import { localSuccessVerification } from '@/lib/bongging-reward';

const result = localSuccessVerification;

export default function RecognizeScreen() {
  const { scale, height } = useResponsive();
  const insets = useSafeAreaInsets();
  const { certificationPhotoUri, xp, growthStacks, pendingCertification, finishBonggingCertification, cancelBonggingCertification } = usePlayState();
  const photo = certificationPhotoUri ? { uri: toImageUri(certificationPhotoUri) } : art.trash;
  const [phase, setPhase] = useState<'analysis' | 'fanfare' | 'result'>('analysis');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [photoHeight, setPhotoHeight] = useState(0);
  const finishFanfare = useCallback(() => setPhase('result'), []);
  const cancelAnalysis = useCallback(() => {
    cancelBonggingCertification();
    router.back();
  }, [cancelBonggingCertification]);
  const completeAnalysis = useCallback(async () => {
    if (!pendingCertification) {
      setPhase('result');
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
      finishBonggingCertification({ xp: result.xp, growthStacks: result.growthStacks });
      setAnalysisError(null);
      setPhase('fanfare');
    } catch {
      setAnalysisError('인증 정보를 만들지 못했어요. 다시 시도해 주세요.');
    }
  }, [finishBonggingCertification, pendingCertification]);
  const toXp = Math.max(xp, result.xp);
  const toGrowth = Math.max(growthStacks, result.growthStacks);
  const photoBudget = photoHeight || Math.max(0, height - insets.top - insets.bottom - scale(320));
  const frameHeight = Math.min(scale(210), Math.max(scale(96), photoBudget - scale(96)));

  return (
    <View style={{ flex: 1, backgroundColor: palette.ink }}>
      <StatusBar style={phase === 'analysis' ? 'dark' : 'light'} />
      <Image source={photo} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} contentFit="cover" />
      <LinearGradient
        colors={['rgba(26,23,31,0.55)', 'rgba(26,23,31,0.05)', 'rgba(26,23,31,0)']}
        locations={[0, 0.42, 1]}
        style={{ position: 'absolute', top: 0, right: 0, left: 0, height: insets.top + scale(168), pointerEvents: 'none' }}
      />
      {phase === 'analysis' ? (
        <AnalysisSkeleton error={analysisError} onCancel={cancelAnalysis} onDone={() => void completeAnalysis()} onRetry={() => void completeAnalysis()} />
      ) : phase === 'fanfare' ? (
        <RewardFanfare fromXp={toXp - result.xp} toXp={toXp} fromGrowth={toGrowth - result.growthStacks} toGrowth={toGrowth} onDone={finishFanfare} />
      ) : (
      <Animated.View entering={FadeIn.duration(280)} style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), marginTop: scale(8) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={() => router.back()}
            style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="close" size={scale(22)} color={palette.ink} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: palette.white, borderRadius: scale(999), paddingHorizontal: scale(12), paddingVertical: scale(8) }}>
              <MaterialIcons name="delete-outline" size={scale(16)} color={palette.ink} />
              <Text style={{ color: palette.ink, fontWeight: '800' }}>인증 결과</Text>
            </View>
          </View>
          <View style={{ width: scale(42) }} />
        </View>
        <View
          onLayout={(event) => setPhotoHeight(event.nativeEvent.layout.height)}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(24), gap: scale(10), overflow: 'hidden' }}>
          {result.items.map((item, index) => (
            <View key={item.name} style={{ backgroundColor: index === 0 ? palette.canola : palette.white, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(6), flexDirection: 'row', gap: scale(4), alignItems: 'center' }}>
              <MaterialIcons name="check" size={scale(16)} color={palette.ink} />
              <Text style={{ fontWeight: '800', color: palette.ink, fontSize: scale(12) }}>
                {item.name} · {item.confidence}%
              </Text>
            </View>
          ))}
          <View style={{ width: frameHeight * 0.9, height: frameHeight, borderWidth: 2, borderColor: palette.canola, borderRadius: scale(16) }} />
        </View>
        <Animated.View
          entering={FadeInDown.duration(420)}
          style={{
            backgroundColor: palette.white,
            borderTopLeftRadius: scale(28),
            borderTopRightRadius: scale(28),
            paddingTop: scale(18),
            paddingHorizontal: scale(20),
            paddingBottom: Math.max(insets.bottom, scale(12)) + scale(8),
            gap: scale(12),
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: scale(8) }}>
            <Text style={{ flex: 1, fontSize: scale(22), fontWeight: '800', color: palette.ink, lineHeight: scale(28) }}>쓰레기 {result.items.length}개를 인증했어요</Text>
            <View style={{ backgroundColor: palette.leafSoft, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(4), marginTop: scale(2) }}>
              <Text style={{ color: palette.leafDeep, fontWeight: '800', fontSize: scale(12) }}>성공</Text>
            </View>
          </View>
          <Text style={{ color: palette.muted, fontSize: scale(14), lineHeight: scale(20) }}>{result.message}</Text>
          <View style={{ flexDirection: 'row', gap: scale(8) }}>
            <RewardPill label="경험치" value={result.xp} backgroundColor={palette.canolaSoft} />
            <RewardPill label="섬 성장" value={result.growthStacks} backgroundColor={palette.leafSoft} />
          </View>
          <View style={{ flexDirection: 'row', gap: scale(10) }}>
            <FigButton label="하나 더 줍기" tone="white" onPress={() => router.replace('/camera')} />
            <FigButton label="섬으로 돌아가기" onPress={() => router.replace('/home')} />
          </View>
        </Animated.View>
      </Animated.View>
      )}
    </View>
  );
}

function RewardPill({ label, value, backgroundColor }: { label: string; value: number; backgroundColor: string }) {
  const { scale } = useResponsive();

  return (
    <View style={{ flex: 1, backgroundColor, borderRadius: scale(16), padding: scale(12) }}>
      <Text style={{ color: palette.muted, fontSize: scale(12), fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: palette.ink, fontSize: scale(22), fontWeight: '800' }}>+{value}</Text>
    </View>
  );
}

function toImageUri(uri: string) {
  if (uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('ph:') || uri.startsWith('assets-library:') || uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http')) {
    return uri;
  }
  return `data:image/jpeg;base64,${uri}`;
}
