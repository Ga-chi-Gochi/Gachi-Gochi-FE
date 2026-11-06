import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, type Href } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PixelSprite } from '@/components/pixel/pixel-sprite';
import { PixelChip, PixelText } from '@/components/pixel/pixel-ui';
import type { PixelSpriteId } from '@/constants/pixel-assets';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

type DeedAction = {
  label: string;
  detail: string;
  reward: string;
  href: Href;
  sprite: PixelSpriteId;
};

const actions: DeedAction[] = [
  {
    label: '걷기',
    detail: '걸어서 산소방울과 물방울을 모아요.',
    reward: '산소 · 물방울',
    href: '/walking',
    sprite: 'seed',
  },
  {
    label: '고치 산책',
    detail: '가치고치와 짧은 산책을 다녀와요.',
    reward: '치장 아이템',
    href: '/stroll',
    sprite: 'buddy',
  },
  {
    label: '쓰레기 줍기',
    detail: '근처 쓰레기를 주워 섬을 깨끗하게 해요.',
    reward: '경험치 · 섬 성장',
    href: '/camera',
    sprite: 'pebble',
  },
  {
    label: '로컬 상점',
    detail: '동네 상점에 들러 단골을 쌓아요.',
    reward: '귤 · 단골',
    href: '/store',
    sprite: 'tangerine',
  },
];

type GoodDeedSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function GoodDeedFab({ onPress }: { onPress: () => void }) {
  const { scale } = useResponsive();

  return (
    <View style={{ alignItems: 'center', marginBottom: scale(6) }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="가치 있는 일 시작"
        onPress={onPress}
        style={{
          minWidth: scale(168),
          height: scale(52),
          paddingHorizontal: scale(16),
          borderWidth: scale(3),
          borderColor: pixel.ink,
          backgroundColor: pixel.leaf,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: scale(8),
        }}>
        <PixelSprite id="seed" size={scale(22)} />
        <Text style={{ color: pixel.white, fontWeight: '800', fontSize: scale(14) }}>가치 있는 일 시작</Text>
      </Pressable>
    </View>
  );
}

export function GoodDeedSheet({ open, onClose }: GoodDeedSheetProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();

  const openAction = (href: Href) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(26,21,32,0.55)' }}
        />

        <View
          style={{
            backgroundColor: pixel.panel,
            borderTopWidth: scale(pixel.border),
            borderLeftWidth: scale(pixel.border),
            borderRightWidth: scale(pixel.border),
            borderColor: pixel.ink,
            paddingTop: scale(12),
            paddingBottom: Math.max(insets.bottom, scale(12)),
            maxHeight: '72%',
          }}>
          <View style={{ alignItems: 'center', marginBottom: scale(8) }}>
            <View style={{ width: scale(44), height: scale(5), backgroundColor: pixel.ink, opacity: 0.2 }} />
          </View>

          <View style={{ paddingHorizontal: scale(16), gap: scale(4), marginBottom: scale(10) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <PixelText size={20}>어떤 가치를 키울까요?</PixelText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                onPress={onClose}
                style={{
                  width: scale(36),
                  height: scale(36),
                  borderWidth: scale(2),
                  borderColor: pixel.ink,
                  backgroundColor: pixel.white,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcons name="close" size={scale(20)} color={pixel.ink} />
              </Pressable>
            </View>
            <PixelText size={12} color={pixel.muted}>
              하나만 골라 시작해 보세요. 보상은 섬과 가치고치에게 돌아가요.
            </PixelText>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: scale(8), gap: scale(10) }}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={() => openAction(action.href)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scale(12),
                  padding: scale(12),
                  backgroundColor: pixel.white,
                  borderWidth: scale(pixel.border),
                  borderColor: pixel.ink,
                }}>
                <View
                  style={{
                    width: scale(52),
                    height: scale(52),
                    borderWidth: scale(2),
                    borderColor: pixel.ink,
                    backgroundColor: pixel.grass,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <PixelSprite id={action.sprite} size={scale(30)} />
                </View>
                <View style={{ flex: 1, gap: scale(4) }}>
                  <PixelText size={15}>{action.label}</PixelText>
                  <PixelText size={12} color={pixel.muted}>
                    {action.detail}
                  </PixelText>
                  <View style={{ alignSelf: 'flex-start' }}>
                    <PixelChip label={action.reward} bg={pixel.sand} />
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={scale(24)} color={pixel.ink} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
