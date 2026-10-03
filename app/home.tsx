import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FigScreen } from '@/components/fig-screen';
import { TabBar } from '@/components/tab-bar';
import { art } from '@/constants/art';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

const actions = [
  { label: '걷기', href: '/walk' as const, icon: 'directions-walk' as const },
  { label: '고치 산책', href: '/stroll' as const, icon: 'pets' as const },
  { label: '쓰레기 줍기', href: '/camera' as const, icon: 'delete-outline' as const },
  { label: '로컬 상점', href: '/store' as const, icon: 'storefront' as const },
];

export default function HomeScreen() {
  const { scale } = useResponsive();
  const [open, setOpen] = useState(false);
  const openAction = (href: (typeof actions)[number]['href']) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <FigScreen colors={['#DDF0FB', '#FFF9F1']}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: scale(20), paddingTop: scale(8) }}>
          <View style={{ backgroundColor: palette.white, borderRadius: scale(999), paddingHorizontal: scale(12), paddingVertical: scale(8) }}>
            <Text style={{ fontWeight: '800', color: palette.ink }}>5p</Text>
          </View>
          <View style={{ width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="notifications-none" size={scale(22)} color={palette.ink} />
          </View>
        </View>
        <View style={{ paddingHorizontal: scale(24), marginTop: scale(16) }}>
          <Text style={{ color: palette.muted, fontSize: scale(14) }}>좋은 아침이에요, 승현님</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(4) }}>
            <Text style={{ fontSize: scale(30), fontWeight: '800', color: palette.ink }}>띠롱이의 섬</Text>
            <View style={{ backgroundColor: palette.leafSoft, borderRadius: scale(999), paddingHorizontal: scale(10), paddingVertical: scale(4) }}>
              <Text style={{ color: palette.leafDeep, fontSize: scale(12), fontWeight: '800' }}>Lv.1 · 알</Text>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={art.island} style={{ width: scale(360), height: scale(220) }} contentFit="contain" />
          <Image source={art.egg} style={{ position: 'absolute', width: scale(60), height: scale(91) }} contentFit="contain" />
        </View>
        <View style={{ alignItems: 'center', marginBottom: scale(8) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="가치 있는 일 시작"
            onPress={() => setOpen(true)}
            style={{
              width: scale(112),
              height: scale(112),
              borderRadius: scale(56),
              backgroundColor: palette.leaf,
              alignItems: 'center',
              justifyContent: 'center',
              gap: scale(2),
            }}>
            <MaterialIcons name="auto-awesome" size={scale(26)} color={palette.white} />
            <Text style={{ color: palette.white, fontWeight: '800', fontSize: scale(14), textAlign: 'center' }}>
              가치 있는 일{'\n'}시작
            </Text>
          </Pressable>
          <Text style={{ marginTop: scale(8), color: palette.muted, fontSize: scale(12) }}>꾹 눌러서 시작</Text>
        </View>
        <TabBar />
        {open ? (
          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: palette.dim }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={art.egg} style={{ width: scale(60), height: scale(91) }} contentFit="contain" />
              <View style={{ marginTop: scale(8), backgroundColor: palette.white, borderRadius: scale(16), paddingHorizontal: scale(12), paddingVertical: scale(6) }}>
                <Text style={{ fontWeight: '800', color: palette.ink }}>키워주세요!</Text>
              </View>
              <Text style={{ marginTop: scale(18), color: palette.white, fontSize: scale(24), fontWeight: '800' }}>어떤 가치를 키워볼까요?</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: scale(10), paddingBottom: scale(28) }}>
              <ActionOrb label={actions[0].label} icon={actions[0].icon} onPress={() => openAction(actions[0].href)} />
              <View style={{ marginBottom: scale(36) }}>
                <ActionOrb label={actions[1].label} icon={actions[1].icon} onPress={() => openAction(actions[1].href)} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                onPress={() => setOpen(false)}
                style={{ width: scale(72), height: scale(72), borderRadius: scale(36), backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center', marginBottom: scale(8) }}>
                <MaterialIcons name="close" size={scale(28)} color={palette.ink} />
              </Pressable>
              <View style={{ marginBottom: scale(36) }}>
                <ActionOrb label={actions[2].label} icon={actions[2].icon} onPress={() => openAction(actions[2].href)} />
              </View>
              <ActionOrb label={actions[3].label} icon={actions[3].icon} onPress={() => openAction(actions[3].href)} />
            </View>
          </View>
        ) : null}
      </View>
    </FigScreen>
  );
}

function ActionOrb({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: 'directions-walk' | 'pets' | 'delete-outline' | 'storefront';
  onPress: () => void;
}) {
  const { scale } = useResponsive();

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ width: scale(76), alignItems: 'center', gap: scale(6) }}>
      <View style={{ width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: palette.white, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={icon} size={scale(26)} color={palette.leafDeep} />
      </View>
      <Text style={{ color: palette.white, fontSize: scale(12), fontWeight: '800', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}
