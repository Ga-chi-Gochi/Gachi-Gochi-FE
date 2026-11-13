import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Alert, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PixelText } from '@/components/pixel/pixel-ui';
import { usePlayState } from '@/components/play-state';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type HomeMenuSheetProps = {
  open: boolean;
  onClose: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onProfile: () => void;
  onSettings: () => void;
};

function tap() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** 홈 메뉴. 프로필, 설정, 사운드 */
export function HomeMenuSheet({ open, onClose, soundOn, onToggleSound, onProfile, onSettings }: HomeMenuSheetProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const { resetLocalData } = usePlayState();

  const onReset = () => {
    Alert.alert('데이터 초기화', '이 기기에 저장된 섬·경험치·걷기 기록을 모두 지울까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: () => {
          onClose();
          void (async () => {
            await resetLocalData();
            Alert.alert('완료', '로컬 데이터를 초기화했어요.');
          })();
        },
      },
    ]);
  };

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="메뉴 닫기"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(26,21,32,0.35)' }}
        />

        <View
          accessibilityViewIsModal
          style={{
            position: 'absolute',
            top: insets.top + scale(56),
            right: scale(14),
            width: scale(220),
            backgroundColor: pixel.panel,
            borderWidth: scale(pixel.border),
            borderColor: pixel.ink,
            padding: scale(8),
            gap: scale(8),
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="메뉴 닫기"
            onPress={onClose}
            style={({ pressed }) => ({
              minHeight: scale(44),
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'flex-end',
              paddingHorizontal: scale(12),
              backgroundColor: pressed ? pixel.sand : pixel.white,
              borderWidth: scale(2),
              borderColor: pixel.ink,
            })}>
            <PixelText size={13}>닫기</PixelText>
          </Pressable>

          <MenuRow icon="person" label="프로필" onPress={() => { tap(); onProfile(); }} />
          <MenuRow icon="settings" label="설정" onPress={() => { tap(); onSettings(); }} />
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={soundOn ? '소리 켜짐' : '소리 꺼짐'}
            accessibilityState={{ checked: soundOn }}
            onPress={() => {
              tap();
              onToggleSound();
            }}
            style={({ pressed }) => ({
              minHeight: scale(48),
              flexDirection: 'row',
              alignItems: 'center',
              gap: scale(10),
              paddingHorizontal: scale(10),
              backgroundColor: pressed ? pixel.sand : pixel.white,
              borderWidth: scale(2),
              borderColor: pixel.ink,
              opacity: soundOn ? 1 : 0.55,
            })}>
            <MaterialIcons name={soundOn ? 'volume-up' : 'volume-off'} size={scale(22)} color={pixel.ink} />
            <PixelText size={16}>사운드</PixelText>
          </Pressable>
          <MenuRow icon="restart-alt" label="데이터 초기화" onPress={() => { tap(); onReset(); }} />
        </View>
      </View>
    </Modal>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { scale } = useResponsive();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: scale(48),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        paddingHorizontal: scale(10),
        backgroundColor: pressed ? pixel.sand : pixel.white,
        borderWidth: scale(2),
        borderColor: pixel.ink,
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}>
      <MaterialIcons name={icon} size={scale(22)} color={pixel.ink} />
      <PixelText size={16}>{label}</PixelText>
    </Pressable>
  );
}
