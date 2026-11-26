import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { IslandGame } from '@/components/island/island-game';
import { VolcanoEruptionProvider } from '@/components/island/volcano-eruption';
import { gachiUi } from '@/constants/gachi-ui';
import { uiButtons, uiHud } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

/** 와이어프레임 스플래시/웰컴 — 홈과 같은 Phaser 섬(파도)을 배경으로 쓴다 */
export default function WelcomeScreen() {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();

  return (
    <VolcanoEruptionProvider>
      <View style={{ flex: 1, backgroundColor: gachiUi.cream }}>
        <IslandGame
          mode="preview"
          petOpen={false}
          onTapCreature={() => undefined}
          onCamera={() => undefined}
          onAsh={() => undefined}
        />

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 2,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            alignItems: 'center',
            justifyContent: 'center',
            gap: scale(14),
            paddingHorizontal: scale(24),
          }}>
          {/* 로고는 자체 외곽선이 있고, 부제만 글자 바깥을 얇게 감싼다 */}
          <Image
            source={uiHud.logo}
            style={{ width: scale(168), height: scale(56), ...pixelImageStyle }}
            contentFit="contain"
            accessibilityLabel="가치고치"
          />
          <View
            style={{
              alignSelf: 'center',
              paddingHorizontal: scale(8),
              paddingVertical: scale(4),
              backgroundColor: 'rgba(237,224,198,0.96)',
              borderWidth: scale(gachiUi.border),
              borderColor: gachiUi.ink,
              borderRadius: scale(6),
            }}>
            <GalmuriText size={9} color={gachiUi.ink} center>
              제주를 돌보면 섬도 고치도 자라요
            </GalmuriText>
          </View>
          <View style={{ height: scale(6) }} />
          <AssetImageButton
            source={uiButtons.greenLogin}
            label="들어가게"
            width={76}
            height={22}
            onPress={() => router.push('/login' as Href)}
          />
          <AssetImageButton
            source={uiButtons.beigeSignup}
            label="회원가입허게"
            width={100}
            height={22}
            onPress={() => router.push('/signup' as Href)}
          />
        </View>
      </View>
    </VolcanoEruptionProvider>
  );
}
