import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { GachiIconButton } from '@/components/gachi-ui/gachi-button';
import { type SpotlightHole } from '@/components/guide/guide-spotlight';
import { usePlayState } from '@/components/play-state';
import { FeatureHelpOverlay } from '@/components/tutorial/feature-help';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import { gachiUi } from '@/constants/gachi-ui';
import { palette } from '@/constants/palette';
import { ISLAND_HOME } from '@/constants/routes';
import { uiButtons, uiCamera } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';
import { isBonggingDailyLimitReached } from '@/lib/bongging-daily';
import { confirmOfflineCertification } from '@/lib/confirm-offline-certification';
import { resolveBonggingLocation } from '@/lib/resolve-bongging-location';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type ViewNode = ComponentRef<typeof View>;

function leaveCamera() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(ISLAND_HOME);
}

/**
 * 봉그깅 카메라 — 와프 1·2
 * 헤더(뒤로·봉그깅·도움) / 가이드 버블 / 파인더 / 크림 하단바
 */
export default function CameraScreen() {
  const { scale, width, height } = useResponsive();
  const insets = useSafeAreaInsets();
  const { stageBonggingCertification } = usePlayState();
  const tutorial = useTutorial();
  const { leaveScreen } = tutorial;
  const guided = tutorial.step === 'bongging-screen';
  const [leavingTutorial, setLeavingTutorial] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const closeRef = useRef<ViewNode>(null);
  const [closeHole, setCloseHole] = useState<SpotlightHole | null>(null);
  const holdCamera = guided || leavingTutorial;
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView>(null);
  const askedForPermission = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [readyFacing, setReadyFacing] = useState<CameraType | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [stageHeight, setStageHeight] = useState(0);
  /** 0: 가운데 담기 / 1: 종류 보이게 — 와프 두 가이드 */
  const [guideIndex, setGuideIndex] = useState(0);

  const granted = permission?.granted === true;
  const previewFacing = isFocused && granted && !holdCamera ? facing : null;
  if (readyFacing && readyFacing !== previewFacing) {
    setReadyFacing(null);
  }
  const ready = previewFacing !== null && readyFacing === previewFacing;

  useEffect(() => {
    if (holdCamera || !isFocused || !permission || permission.granted || !permission.canAskAgain || askedForPermission.current) {
      return;
    }
    askedForPermission.current = true;
    void requestPermission();
  }, [holdCamera, isFocused, permission, requestPermission]);

  useFocusEffect(
    useCallback(() => {
      return () => leaveScreen('bongging');
    }, [leaveScreen]),
  );

  useEffect(() => {
    if (guided || holdCamera) {
      return;
    }
    const timer = setInterval(() => {
      setGuideIndex((current) => (current + 1) % 2);
    }, 3200);
    return () => clearInterval(timer);
  }, [guided, holdCamera]);

  const measureClose = useCallback(() => {
    const node = closeRef.current;
    if (!node) {
      return;
    }
    node.measureInWindow((x, y, measuredWidth, measuredHeight) => {
      if (measuredWidth <= 0 || measuredHeight <= 0) {
        setCloseHole(null);
        return;
      }
      const pad = scale(12);
      const radius = Math.max(measuredWidth, measuredHeight) / 2 + pad;
      const next: SpotlightHole = {
        centerX: x + measuredWidth / 2,
        centerY: y + measuredHeight / 2,
        radius,
      };
      setCloseHole((current) =>
        current &&
        'centerX' in current &&
        current.centerX === next.centerX &&
        current.centerY === next.centerY &&
        current.radius === next.radius
          ? current
          : next,
      );
    });
  }, [scale]);

  useEffect(() => {
    if (!guided) {
      return;
    }
    const id = requestAnimationFrame(measureClose);
    return () => cancelAnimationFrame(id);
  }, [guided, measureClose, insets.top, insets.left]);

  const focusHole = guided ? closeHole : null;

  async function allowCamera() {
    if (permission && !permission.canAskAgain) {
      await Linking.openSettings();
      return;
    }
    await requestPermission();
  }

  async function shoot() {
    if (!granted) {
      await allowCamera();
      return;
    }
    if (!cameraRef.current || !ready || busy) {
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, exif: true });
      if (!photo?.uri) {
        warnMissingPhoto();
        return;
      }
      await certifyPhoto({ uri: photo.uri, exif: photo.exif, fileName: 'bongging.jpg' });
    } catch {
      setNotice('사진을 찍지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function pickFromGallery() {
    if (busy) {
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        exif: true,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.uri) {
        warnMissingPhoto();
        return;
      }
      await certifyPhoto({ uri: asset.uri, exif: asset.exif, fileName: asset.fileName });
    } catch {
      setNotice('갤러리에서 사진을 불러오지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  function warnMissingPhoto() {
    Alert.alert('사진이 필요해요', '쓰레기를 찍거나 갤러리에서 골라야 인증 화면으로 넘어갈 수 있어요.');
  }

  async function certifyPhoto(photo: { uri: string; exif?: unknown; fileName?: string | null }) {
    if (await isBonggingDailyLimitReached()) {
      stageBonggingCertification({
        imageUri: photo.uri,
        fileName: photo.fileName,
        latitude: null,
        longitude: null,
        locationSource: 'none',
      });
      router.push('/recognize');
      return;
    }

    try {
      const location = await resolveBonggingLocation(photo.exif);
      if (location.status === 'cancelled') {
        return;
      }

      const proceedOffline = await confirmOfflineCertification();
      if (!proceedOffline) {
        return;
      }

      stageBonggingCertification({
        imageUri: photo.uri,
        fileName: photo.fileName,
        latitude: location.status === 'coordinates' ? location.latitude : null,
        longitude: location.status === 'coordinates' ? location.longitude : null,
        locationSource: location.status === 'coordinates' ? location.source : 'none',
      });
      router.push('/recognize');
    } catch {
      setNotice('인증 정보를 만들지 못했어요. 다시 시도해 주세요.');
    }
  }

  function flipCamera() {
    if (!granted || busy) {
      return;
    }
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }

  const shutterDisabled = granted && (!ready || busy);
  const sidePad = scale(16);
  const bubbleWidth = Math.min(scale(340), width - sidePad * 2);
  const stageBudget = stageHeight || Math.max(0, height - insets.top - insets.bottom - scale(300));
  const finder = Math.min(scale(280), Math.max(scale(200), Math.min(width - sidePad * 2, stageBudget - scale(8))));
  const bottomBarPad = Math.max(insets.bottom, scale(10));
  const guideSource = guideIndex === 0 ? uiCamera.bubbleGuide : uiCamera.bubbleFound;

  return (
    <View style={{ flex: 1, backgroundColor: '#2C2926' }}>
      {isFocused ? <StatusBar style="light" /> : null}
      {isFocused && granted && !holdCamera ? (
        <CameraView
          ref={cameraRef}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          facing={facing}
          mode="picture"
          onCameraReady={() => setReadyFacing(facing)}
          onMountError={() => {
            setReadyFacing(null);
            setNotice('카메라를 켜지 못했어요. 갤러리에서 사진을 고를 수 있어요.');
          }}
        />
      ) : null}
      <LinearGradient
        colors={['rgba(44,41,38,0.72)', 'rgba(44,41,38,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + scale(120), pointerEvents: 'none' }}
      />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* 헤더: ← | 봉그깅 | 도움 */}
        <View style={{ marginTop: scale(6), height: scale(40), justifyContent: 'center' }}>
          <View
            ref={closeRef}
            collapsable={false}
            onLayout={guided ? measureClose : undefined}
            style={{ position: 'absolute', left: Math.max(insets.left, sidePad), top: '50%', marginTop: -scale(16) }}>
            <GachiIconButton kind="squareBack" label="뒤로" size={32} onPress={leaveCamera} />
          </View>
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <GalmuriText size={14} bold color={gachiUi.white} center>
              봉그깅
            </GalmuriText>
          </View>
          {guided ? null : (
            <View style={{ position: 'absolute', right: Math.max(insets.right, sidePad), top: '50%', marginTop: -scale(16) }}>
              <GachiIconButton kind="squareSettings" label="도움말" size={32} onPress={() => setHelpOpen(true)} />
            </View>
          )}
        </View>

        {/* 가이드 말풍선 — 와프 두 문구 에셋 교대 */}
        <View style={{ marginTop: scale(10), alignItems: 'center', paddingHorizontal: sidePad }}>
          <Image
            source={guideSource}
            style={{ width: bubbleWidth, height: bubbleWidth * (52 / 380), ...pixelImageStyle }}
            contentFit="contain"
          />
        </View>

        {/* 뷰파인더 */}
        <View
          onLayout={(event) => setStageHeight(event.nativeEvent.layout.height)}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: granted || guided ? 'center' : 'flex-start',
            paddingTop: granted || guided ? 0 : scale(16),
            paddingHorizontal: sidePad,
            overflow: 'hidden',
          }}>
          {granted || guided ? (
            <View style={{ width: finder, height: finder, alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={uiCamera.corners}
                style={{ position: 'absolute', width: finder, height: finder, ...pixelImageStyle }}
                contentFit="contain"
              />
            </View>
          ) : (
            <View
              style={{
                alignSelf: 'stretch',
                backgroundColor: palette.white,
                borderRadius: scale(12),
                padding: scale(20),
                gap: scale(12),
              }}>
              <GalmuriText size={14} bold>
                {permission ? '카메라 권한이 필요해요' : '카메라를 준비하고 있어요'}
              </GalmuriText>
              <GalmuriText size={9} color={gachiUi.inkSoft}>
                쓰레기 사진을 찍거나, 갤러리에서 고를 수 있어요.
              </GalmuriText>
              {permission ? (
                <AssetImageButton
                  source={uiButtons.greenAllow}
                  label={permission.canAskAgain ? '허락허쿠다' : '설정에서 허용하기'}
                  width={80}
                  height={20}
                  onPress={() => {
                    void allowCamera();
                  }}
                />
              ) : null}
            </View>
          )}
        </View>

        {notice ? (
          <Text
            style={{
              textAlign: 'center',
              color: palette.white,
              fontSize: scale(12),
              paddingHorizontal: sidePad,
              paddingBottom: scale(8),
            }}>
            {notice}
          </Text>
        ) : null}

        {/* 하단 크림 컨트롤 바: 갤러리 | 셔터 | 전환 */}
        <View
          style={{
            backgroundColor: gachiUi.cream,
            borderTopWidth: scale(3),
            borderTopColor: gachiUi.ink,
            paddingTop: scale(14),
            paddingBottom: bottomBarPad,
            paddingHorizontal: scale(28),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <AssetImageButton
            source={uiCamera.gallery}
            label="갤러리에서 선택"
            width={44}
            height={48}
            disabled={busy}
            onPress={() => {
              void pickFromGallery();
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="촬영"
            accessibilityState={{ disabled: shutterDisabled }}
            disabled={shutterDisabled}
            onPress={() => {
              void shoot();
            }}
            style={{ opacity: shutterDisabled ? 0.5 : 1, marginTop: scale(-6) }}>
            <Image
              source={uiCamera.shutter}
              style={{ width: scale(72), height: scale(78), ...pixelImageStyle }}
              contentFit="contain"
            />
          </Pressable>
          <AssetImageButton
            source={uiCamera.flip}
            label="카메라 전환"
            width={44}
            height={48}
            disabled={!granted || busy}
            onPress={flipCamera}
          />
        </View>
      </View>
      {guided ? (
        <TutorialOverlay
          step={tutorial.scope === 'full' ? 2 : 1}
          total={tutorial.scope === 'full' ? undefined : 1}
          title="봉그깅은 이렇게 해요"
          body="쓰레기를 사진으로 찍어 인증하면 경험치를 얻어요. 경험치가 쌓이면 고치가 자라요."
          hint="왼쪽 위 뒤로 버튼을 눌러 돌아가요"
          hole={focusHole ? () => focusHole : undefined}
          placement="below"
          align="start"
          onSkip={() => {
            setLeavingTutorial(true);
            tutorial.skip();
            leaveCamera();
          }}
          interceptBack={false}
          zIndex={100}
        />
      ) : null}
      {helpOpen && !guided ? <FeatureHelpOverlay topic="bongging" onClose={() => setHelpOpen(false)} zIndex={90} /> : null}
    </View>
  );
}
