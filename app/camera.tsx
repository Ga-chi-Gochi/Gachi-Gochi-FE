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
import { type SpotlightHole } from '@/components/guide/guide-spotlight';
import { usePlayState } from '@/components/play-state';
import { FeatureHelpOverlay } from '@/components/tutorial/feature-help';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import { gachiUi } from '@/constants/gachi-ui';
import { palette } from '@/constants/palette';
import { uiButtons, uiCamera } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';
import { BONGGING_DAILY_LIMIT, isBonggingDailyLimitReached, readBonggingDailyCount } from '@/lib/bongging-daily';
import { confirmOfflineCertification } from '@/lib/confirm-offline-certification';
import { requestLocationPermissionIfNeeded, resolveBonggingLocation } from '@/lib/resolve-bongging-location';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type ViewNode = ComponentRef<typeof View>;

export default function CameraScreen() {
  const { scale, width, height } = useResponsive();
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
  const [dailyCount, setDailyCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);

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
    useCallback(() => {
      void (async () => {
        const count = await readBonggingDailyCount();
        setDailyCount(count);
        setLimitReached(count >= BONGGING_DAILY_LIMIT);
      })();
      return () => leaveScreen('bongging');
    }, [leaveScreen]),
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
    if (await isBonggingDailyLimitReached()) {
      setLimitReached(true);
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
  // 와프(393×852) 기준: 뷰파인더 ≈ 280, 버블 ≈ 340, 하단 바 ≈ 112 + safe
  const sidePad = scale(16);
  const bubbleWidth = Math.min(scale(340), width - sidePad * 2);
  const stageBudget = stageHeight || Math.max(0, height - insets.top - insets.bottom - scale(320));
  const finder = Math.min(scale(280), Math.max(scale(200), Math.min(width - sidePad * 2, stageBudget - scale(8))));
  const bottomBarPad = Math.max(insets.bottom, scale(10));

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
      {/* 상단만 살짝 어둡게 — 하단은 크림 컨트롤 바가 받친다 */}
      <LinearGradient
        colors={['rgba(44,41,38,0.72)', 'rgba(44,41,38,0)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + scale(120), pointerEvents: 'none' }}
      />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* 헤더: ✕ | 봉그깅 태그 | 설정 */}
        <View style={{ marginTop: scale(6), height: scale(40), justifyContent: 'center' }}>
          <View
            ref={closeRef}
            collapsable={false}
            onLayout={guided ? measureClose : undefined}
            style={{ position: 'absolute', left: Math.max(insets.left, sidePad), top: '50%', marginTop: -scale(18) }}>
            <AssetImageButton
              source={uiCamera.close}
              label="닫기"
              width={36}
              height={40}
              onPress={() => router.replace('/(tabs)')}
            />
          </View>
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Image source={uiCamera.tagPickup} style={{ width: scale(132), height: scale(24), ...pixelImageStyle }} contentFit="contain" />
          </View>
          {guided ? null : (
            <View style={{ position: 'absolute', right: Math.max(insets.right, sidePad), top: '50%', marginTop: -scale(18) }}>
              <AssetImageButton source={uiCamera.settings} label="도움말" width={36} height={40} onPress={() => setHelpOpen(true)} />
            </View>
          )}
        </View>

        {/* 가이드 말풍선 */}
        <View style={{ marginTop: scale(10), alignItems: 'center', paddingHorizontal: sidePad }}>
          <Image
            source={uiCamera.bubbleGuide}
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

        {/* 위치 → 오늘 한도 (와프: 파인더 아래) */}
        <View style={{ alignItems: 'center', gap: scale(8), paddingVertical: scale(10) }}>
          <Image
            source={notice ? uiCamera.locationWait : uiCamera.location}
            style={{
              width: notice ? scale(198) : scale(170),
              height: scale(32),
              ...pixelImageStyle,
            }}
            contentFit="contain"
          />
          {notice ? (
            <Text style={{ textAlign: 'center', color: palette.white, fontSize: scale(12) }}>{notice}</Text>
          ) : null}
          {!guided ? (
            <View
              style={{
                paddingHorizontal: scale(14),
                paddingVertical: scale(5),
                borderRadius: scale(10),
                backgroundColor: gachiUi.cream,
                borderWidth: scale(2),
                borderColor: gachiUi.ink,
              }}>
              <GalmuriText size={8} bold color={limitReached ? gachiUi.greenDeep : gachiUi.ink} center>
                {`오늘 봉그깅 ${Math.min(dailyCount, BONGGING_DAILY_LIMIT)}/${BONGGING_DAILY_LIMIT}`}
              </GalmuriText>
            </View>
          ) : null}
        </View>

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
