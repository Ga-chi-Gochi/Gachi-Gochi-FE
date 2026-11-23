import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { GachiTextField } from '@/components/gachi-ui/gachi-text-field';
import { AUTH_ENABLED } from '@/constants/auth';
import { gachiUi } from '@/constants/gachi-ui';
import { ISLAND_HOME } from '@/constants/routes';
import { uiButtons, uiCharacter, uiHud } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

/** 와이어프레임 로그인 (PDF 2페이지) */
export default function LoginScreen() {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const [autoLogin, setAutoLogin] = useState(true);

  const enter = () => {
    router.replace(ISLAND_HOME as Href);
  };

  return (
    <View style={{ flex: 1, backgroundColor: gachiUi.cream }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + scale(28),
          paddingBottom: insets.bottom + scale(24),
          paddingHorizontal: scale(32),
          alignItems: 'center',
          gap: scale(16),
        }}
        keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: scale(8) }}>
          <Image
            source={uiHud.logo}
            style={{ width: scale(156), height: scale(52), ...pixelImageStyle }}
            contentFit="contain"
            accessibilityLabel="가치고치"
          />
          <Image
            source={uiCharacter.adult}
            style={{ width: scale(96), height: scale(104), ...pixelImageStyle }}
            contentFit="contain"
          />
        </View>

        <View style={{ alignSelf: 'stretch', gap: scale(12) }}>
          <GachiTextField
            placeholder="이메일을 작성하세요"
            editable={AUTH_ENABLED}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <GachiTextField placeholder="비밀번호를 입력하세요" editable={AUTH_ENABLED} secureTextEntry />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="자동 로그인"
          onPress={() => setAutoLogin((v) => !v)}
          style={{
            alignSelf: 'stretch',
            flexDirection: 'row',
            alignItems: 'center',
            gap: scale(10),
          }}>
          <Switch
            value={autoLogin}
            onValueChange={setAutoLogin}
            trackColor={{ false: gachiUi.gray, true: gachiUi.green }}
            thumbColor={gachiUi.white}
          />
          <GalmuriText size={9}>자동 로그인</GalmuriText>
        </Pressable>

        <View style={{ alignItems: 'center', gap: scale(12), paddingTop: scale(8) }}>
          <AssetImageButton source={uiButtons.greenLogin} label="들어가게" width={76} height={22} onPress={enter} />
          <AssetImageButton
            source={uiButtons.beigeSignup}
            label="회원가입허게"
            width={100}
            height={22}
            onPress={() => router.push('/signup' as Href)}
          />
          {!AUTH_ENABLED ? (
            <GalmuriText size={9} color={gachiUi.inkSoft} center>
              백엔드 연동 전이라 홈으로 바로 들어갈 수 있어요
            </GalmuriText>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
