import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { gachiUi } from '@/constants/gachi-ui';
import { useResponsive } from '@/hooks/use-responsive';

export type GachiTabKey = 'island' | 'character' | 'coin';

export const GACHI_TABS: { key: GachiTabKey; label: string }[] = [
  { key: 'island', label: '섬 꾸미기' },
  { key: 'character', label: '캐릭터' },
  { key: 'coin', label: '코인' },
];

type GachiTabBarProps = {
  active: GachiTabKey;
  onChange: (key: GachiTabKey) => void;
};

/** 에셋 탭(섬 꾸미기·캐릭터·코인) 톤. 문구는 갈무리 */
export function GachiTabBar({ active, onChange }: GachiTabBarProps) {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();
  const border = scale(gachiUi.border);
  const height = scale(36);

  return (
    <View
      style={{
        flexDirection: 'row',
        paddingBottom: Math.max(insets.bottom, scale(6)),
        paddingHorizontal: scale(10),
        paddingTop: scale(6),
        backgroundColor: gachiUi.cream,
        borderTopWidth: border,
        borderTopColor: gachiUi.ink,
        gap: scale(6),
      }}>
      {GACHI_TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            style={{
              flex: 1,
              height,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? gachiUi.tabOn : gachiUi.tabOff,
              borderWidth: border,
              borderColor: gachiUi.ink,
              borderTopLeftRadius: scale(8),
              borderTopRightRadius: scale(8),
            }}>
            <GalmuriText size={9} bold color={selected ? gachiUi.ink : gachiUi.cream} center>
              {tab.label}
            </GalmuriText>
          </Pressable>
        );
      })}
    </View>
  );
}
