import { router, usePathname, type Href } from 'expo-router';
import { Modal, Pressable, View } from 'react-native';

import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { GachiButton } from '@/components/gachi-ui/gachi-button';
import { usePlayState } from '@/components/play-state';
import { gachiUi } from '@/constants/gachi-ui';
import { useResponsive } from '@/hooks/use-responsive';

const HOME_HREF = '/(tabs)' as Href;

function isHomePath(pathname: string | null) {
  if (!pathname) {
    return false;
  }
  return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/' || pathname === '/(tabs)/index';
}

/**
 * 홈이 아닌 화면에서 성장/섬 XP 임계에 닿으면 띄운다.
 * 닫아도 pending 은 남고, 나중에 홈에 가면 연출이 이어진다.
 */
export function ProgressHomeInvite() {
  const { scale } = useResponsive();
  const pathname = usePathname();
  const { homeInvite, dismissHomeInvite } = usePlayState();
  const onHome = isHomePath(pathname);
  const open = Boolean(homeInvite) && !onHome && pathname !== '/walking';

  if (!homeInvite) {
    return null;
  }

  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={dismissHomeInvite}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(61,46,34,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: scale(24),
        }}>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={dismissHomeInvite} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <View
          style={{
            width: '100%',
            maxWidth: scale(300),
            backgroundColor: gachiUi.panel,
            borderWidth: scale(gachiUi.border),
            borderColor: gachiUi.ink,
            borderRadius: scale(10),
            paddingHorizontal: scale(18),
            paddingTop: scale(20),
            paddingBottom: scale(16),
            gap: scale(12),
            zIndex: 1,
          }}>
          <GalmuriText size={12} bold center>
            {homeInvite.title}
          </GalmuriText>
          <GalmuriText size={9} color={gachiUi.inkSoft} center>
            {homeInvite.body}
          </GalmuriText>
          <View style={{ alignItems: 'center', gap: scale(8), marginTop: scale(4) }}>
            <GachiButton
              label="섬으로 가기"
              width="wide"
              onPress={() => {
                dismissHomeInvite();
                router.replace(HOME_HREF);
              }}
            />
            <GachiButton label="나중에" tone="beige" width="wide" onPress={dismissHomeInvite} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
