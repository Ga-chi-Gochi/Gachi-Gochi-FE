import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayState } from '@/components/play-state';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';
import { confirmOfflineCertification } from '@/lib/confirm-offline-certification';
import { requestLocationPermissionIfNeeded, resolveBonggingLocation } from '@/lib/resolve-bongging-location';

export default function CameraScreen() {
  const { scale, height } = useResponsive();
  const insets = useSafeAreaInsets();
  const { stageBonggingCertification } = usePlayState();
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
  const previewFacing = isFocused && granted ? facing : null;
  if (readyFacing && readyFacing !== previewFacing) {
    setReadyFacing(null);
  }
  const ready = previewFacing !== null && readyFacing === previewFacing;

  useEffect(() => {
    if (!isFocused || !permission || permission.granted || !permission.canAskAgain || askedForPermission.current) {
      return;
    }
    askedForPermission.current = true;
    void requestPermission();
  }, [isFocused, permission, requestPermission]);

  useEffect(() => {
    if (!isFocused || askedForLocation.current) {
      return;
    }
    askedForLocation.current = true;
    void requestLocationPermissionIfNeeded();
  }, [isFocused]);

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
      {isFocused && granted ? (
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), marginTop: scale(8) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={() => router.back()}
            style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="close" size={scale(22)} color={palette.ink} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: palette.white, borderRadius: scale(999), paddingHorizontal: scale(12), paddingVertical: scale(8) }}>
            <MaterialIcons name="delete-outline" size={scale(16)} color={palette.ink} />
            <Text style={{ color: palette.ink, fontWeight: '700' }}>쓰레기 줍기</Text>
          </View>
          <View style={{ width: scale(42) }} />
        </View>
        <View style={{ marginTop: scale(16), marginHorizontal: scale(48), backgroundColor: palette.white, borderRadius: scale(18), padding: scale(8), flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
          <Image source={art.idle} style={{ width: scale(36), height: scale(41) }} contentFit="contain" />
          <Text style={{ flex: 1, color: palette.ink, fontWeight: '700', fontSize: scale(14) }}>카메라를 켜고 쓰레기를 주워줘!</Text>
        </View>
        <View
          onLayout={(event) => setStageHeight(event.nativeEvent.layout.height)}
          style={{ flex: 1, alignItems: 'center', justifyContent: granted ? 'center' : 'flex-start', paddingTop: granted ? 0 : scale(16), paddingHorizontal: scale(24), overflow: 'hidden' }}>
          {granted ? (
            <View style={{ width: finder, height: finder, borderRadius: scale(24), borderWidth: 3, borderColor: palette.white }} />
          ) : (
            <View style={{ alignSelf: 'stretch', backgroundColor: palette.white, borderRadius: scale(20), padding: scale(20), gap: scale(12) }}>
              <Text style={{ color: palette.ink, fontSize: scale(18), fontWeight: '800' }}>
                {permission ? '카메라 권한이 필요해요' : '카메라를 준비하고 있어요'}
              </Text>
              <Text style={{ color: palette.body, fontSize: scale(14), lineHeight: scale(20) }}>
                쓰레기 사진을 찍거나, 갤러리에서 고를 수 있어요.
              </Text>
              {permission ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={permission.canAskAgain ? '카메라 허용하기' : '설정에서 허용하기'}
                  onPress={() => {
                    void allowCamera();
                  }}
                  style={{ minHeight: scale(48), borderRadius: scale(16), backgroundColor: palette.tangerine, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: palette.white, fontSize: scale(16), fontWeight: '800' }}>
                    {permission.canAskAgain ? '카메라 허용하기' : '설정에서 허용하기'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
        <Text style={{ textAlign: 'center', color: palette.white, fontSize: scale(14), marginBottom: scale(8) }}>
          {notice ?? (granted ? '쓰레기가 화면 가운데 오게 맞춰주세요' : '갤러리 사진으로도 인증을 시작할 수 있어요')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: Math.max(insets.bottom, scale(12)) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="갤러리에서 선택"
            disabled={busy}
            onPress={() => {
              void pickFromGallery();
            }}
            style={{ width: scale(48), height: scale(48), borderRadius: scale(12), backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
            <MaterialIcons name="photo-library" size={scale(22)} color={palette.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="촬영"
            accessibilityState={{ disabled: shutterDisabled }}
            disabled={shutterDisabled}
            onPress={() => {
              void shoot();
            }}
            style={{ width: scale(80), height: scale(80), borderRadius: scale(40), borderWidth: scale(4), borderColor: palette.white, alignItems: 'center', justifyContent: 'center', opacity: shutterDisabled ? 0.5 : 1 }}>
            <View style={{ width: scale(62), height: scale(62), borderRadius: scale(31), backgroundColor: palette.white }} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카메라 전환"
            disabled={!granted || busy}
            onPress={flipCamera}
            style={{ width: scale(48), height: scale(48), borderRadius: scale(24), backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', opacity: !granted || busy ? 0.5 : 1 }}>
            <MaterialIcons name="flip-camera-ios" size={scale(22)} color={palette.ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
