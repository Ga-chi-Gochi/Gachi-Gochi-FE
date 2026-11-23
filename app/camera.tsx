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
import { type SpotlightHole } from '@/components/guide/guide-spotlight';
import { usePlayState } from '@/components/play-state';
import { FeatureHelpButton, FeatureHelpOverlay } from '@/components/tutorial/feature-help';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import { palette } from '@/constants/palette';
import { uiButtons, uiCamera } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';
import { confirmOfflineCertification } from '@/lib/confirm-offline-certification';
import { requestLocationPermissionIfNeeded, resolveBonggingLocation } from '@/lib/resolve-bongging-location';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type ViewNode = ComponentRef<typeof View>;

export default function CameraScreen() {
  const { scale, height } = useResponsive();
  const insets = useSafeAreaInsets();
  const { stageBonggingCertification } = usePlayState();
  const tutorial = useTutorial();
  const { leaveScreen } = tutorial;
  // 튜토리얼 중에는 권한 요청과 실제 카메라를 켜지 않고, 설명만 보여 준다
  const guided = tutorial.step === 'bongging-screen';
  const [leavingTutorial, setLeavingTutorial] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const closeRef = useRef<ViewNode>(null);
  const [closeHole, setCloseHole] = useState<SpotlightHole | null>(null);
  const holdCamera = guided || leavingTutorial;
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView>(null);
  const askedForPermission = useRef(false);
  const askedForLocation = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [readyFacing, setReadyFacing] = useState<CameraType | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [stageHeight, setStageHeight] = useState(0);

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

  useEffect(() => {
    if (holdCamera || !isFocused || askedForLocation.current) {
      return;
    }
    askedForLocation.current = true;
    void requestLocationPermissionIfNeeded();
  }, [holdCamera, isFocused]);

  // 이 화면을 떠나면(뒤로가기·스와이프 모두) 튜토리얼이 다음 단계로 넘어간다
  useFocusEffect(
    useCallback(() => () => leaveScreen('bongging'), [leaveScreen]),
  );

  /** 닫기 버튼을 실제로 재서, 어림잡은 좌표가 아니라 버튼 정중앙에 구멍을 맞춘다 */
  const measureClose = useCallback(() => {
    const node = closeRef.current;
    if (!node) {
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        setCloseHole(null);
        return;
      }
      const pad = scale(12);
      const radius = Math.max(width, height) / 2 + pad;
      const next: SpotlightHole = {
        centerX: x + width / 2,
        centerY: y + height / 2,
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
    setNotice('위치를 확인하고 있어요');
    try {
      const location = await resolveBonggingLocation(photo.exif);
      if (location.status === 'cancelled') {
        setNotice(null);
        return;
      }

      const proceedOffline = await confirmOfflineCertification();
      if (!proceedOffline) {
        setNotice(null);
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
  const stageBudget = stageHeight || Math.max(0, height - insets.top - insets.bottom - scale(280));
  const finder = Math.min(scale(250), Math.max(scale(120), stageBudget - scale(16)));

  return (
    <View style={{ flex: 1, backgroundColor: palette.ink }}>
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
        colors={['rgba(26,23,31,0.62)', 'rgba(26,23,31,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + scale(148), pointerEvents: 'none' }}
      />
      <LinearGradient
        colors={['rgba(26,23,31,0)', 'rgba(26,23,31,0.28)', 'rgba(26,23,31,0.82)']}
        locations={[0, 0.35, 1]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: scale(210) + insets.bottom, pointerEvents: 'none' }}
      />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ marginTop: scale(8), minHeight: scale(46), justifyContent: 'center' }}>
          <View
            ref={closeRef}
            collapsable={false}
            onLayout={guided ? measureClose : undefined}
            style={{ position: 'absolute', left: Math.max(insets.left, scale(12)), top: '50%', marginTop: -scale(16) }}>
            <AssetImageButton source={uiCamera.close} label="닫기" width={32} height={32} onPress={() => router.back()} />
          </View>
          {guided ? null : (
            <View style={{ position: 'absolute', right: Math.max(insets.right, scale(12)), top: '50%', marginTop: -scale(21) }}>
              <FeatureHelpButton onPress={() => setHelpOpen(true)} />
            </View>
          )}
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Image source={uiCamera.tagPickup} style={{ width: scale(100), height: scale(28), ...pixelImageStyle }} contentFit="contain" />
          </View>
        </View>
        <View style={{ marginTop: scale(12), alignItems: 'center' }}>
          <Image source={uiCamera.bubbleGuide} style={{ width: scale(220), height: scale(36), ...pixelImageStyle }} contentFit="contain" />
        </View>
        <View
          onLayout={(event) => setStageHeight(event.nativeEvent.layout.height)}
          style={{ flex: 1, alignItems: 'center', justifyContent: granted || guided ? 'center' : 'flex-start', paddingTop: granted || guided ? 0 : scale(16), paddingHorizontal: scale(24), overflow: 'hidden' }}>
          {granted || guided ? (
            <View style={{ width: finder, height: finder, alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={uiCamera.corners}
                style={{ position: 'absolute', width: finder, height: finder, ...pixelImageStyle }}
                contentFit="contain"
              />
            </View>
          ) : (
            <View style={{ alignSelf: 'stretch', backgroundColor: palette.white, borderRadius: scale(12), padding: scale(20), gap: scale(12) }}>
              <Text style={{ color: palette.ink, fontSize: scale(18), fontWeight: '800' }}>
                {permission ? '카메라 권한이 필요해요' : '카메라를 준비하고 있어요'}
              </Text>
              <Text style={{ color: palette.body, fontSize: scale(14), lineHeight: scale(20) }}>
                쓰레기 사진을 찍거나, 갤러리에서 고를 수 있어요.
              </Text>
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
        <View style={{ alignItems: 'center', marginBottom: scale(8) }}>
          <Image
            source={notice ? uiCamera.locationWait : uiCamera.location}
            style={{ width: scale(180), height: scale(24), ...pixelImageStyle }}
            contentFit="contain"
          />
          {notice ? (
            <Text style={{ textAlign: 'center', color: palette.white, fontSize: scale(12), marginTop: scale(4) }}>{notice}</Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: Math.max(insets.bottom, scale(12)) }}>
          <AssetImageButton
            source={uiCamera.gallery}
            label="갤러리에서 선택"
            width={40}
            height={40}
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
            style={{ opacity: shutterDisabled ? 0.5 : 1 }}>
            <Image source={uiCamera.shutter} style={{ width: scale(72), height: scale(72), ...pixelImageStyle }} contentFit="contain" />
          </Pressable>
          <AssetImageButton
            source={uiCamera.flip}
            label="카메라 전환"
            width={40}
            height={40}
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
          hint="왼쪽 위 ✕ 버튼을 눌러 돌아가요"
          hole={focusHole ? () => focusHole : undefined}
          placement="below"
          align="start"
          onSkip={() => {
            setLeavingTutorial(true);
            tutorial.skip();
            router.back();
          }}
          interceptBack={false}
          zIndex={100}
        />
      ) : null}
      {helpOpen && !guided ? <FeatureHelpOverlay topic="bongging" onClose={() => setHelpOpen(false)} zIndex={90} /> : null}
    </View>
  );
}
