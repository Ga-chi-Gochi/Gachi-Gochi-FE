import { useEffect } from 'react';
import { BackHandler, Pressable, View } from 'react-native';

import { PixelButton, PixelPanel, PixelText } from '@/components/pixel/pixel-ui';
import { getFeatureHelp, type FeatureHelpTopic } from '@/constants/feature-help';
import { pixel } from '@/constants/pixel-theme';
import { useResponsive } from '@/hooks/use-responsive';

export type { FeatureHelpTopic };

/**
 * 공통 물음표 버튼.
 * 클릭 동작은 화면에서 onPress 로 연결하고, 설명 UI 는 FeatureHelpOverlay 로 따로 띄운다.
 * size 는 터치/배치용 칸. 실제 원은 더 작게 그려 홈 아이콘 열과도 맞춘다.
 */
export function FeatureHelpButton({ onPress, size = 42 }: { onPress: () => void; size?: number }) {
  const { scale } = useResponsive();
  const box = scale(size);
  const mark = scale(Math.max(22, Math.round(size * 0.64)));
  const stroke = Math.max(2, scale(2));
  const glyph = Math.max(11, Math.round(size * 0.28));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="도움말"
      onPress={onPress}
      hitSlop={8}
      style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      {({ pressed }) => (
        <View
          style={{
            width: mark,
            height: mark,
            borderRadius: mark / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? pixel.sand : pixel.panel,
            borderWidth: stroke,
            borderColor: pixel.ink,
            opacity: pressed ? 0.92 : 1,
          }}>
          <PixelText size={glyph} color={pixel.ink} center>
            ?
          </PixelText>
        </View>
      )}
    </Pressable>
  );
}

/**
 * 기능 도움말 모달. topic 에 맞는 설명을 중앙에 띄운다.
 * 버튼을 누른 화면에서 open 상태를 관리한 뒤, 열려 있을 때만 렌더한다.
 */
export function FeatureHelpOverlay({
  topic,
  onClose,
  zIndex = 60,
}: {
  topic: FeatureHelpTopic;
  onClose: () => void;
  zIndex?: number;
}) {
  const { scale } = useResponsive();
  const help = getFeatureHelp(topic);

  // 안드로이드 뒤로가기는 앱을 닫지 않고 도움말만 닫는다
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex,
        justifyContent: 'center',
        paddingHorizontal: scale(20),
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="도움말 닫기"
        onPress={onClose}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: pixel.dim }}
      />
      <View style={{ width: '100%', maxWidth: scale(360), alignSelf: 'center' }}>
        <PixelPanel style={{ padding: scale(18), gap: scale(14) }}>
          <PixelText size={18} center>
            {help.title}
          </PixelText>
          <View style={{ gap: scale(8) }}>
            {help.lines.map((line, index) => (
              <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
                <View
                  style={{
                    width: scale(24),
                    height: scale(24),
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pixel.tangerine,
                    borderWidth: scale(2),
                    borderColor: pixel.ink,
                  }}>
                  <PixelText size={12} color={pixel.white}>
                    {String(index + 1)}
                  </PixelText>
                </View>
                <View style={{ flex: 1 }}>
                  <PixelText size={14} weight="500">
                    {line}
                  </PixelText>
                </View>
              </View>
            ))}
          </View>
          <PixelButton label="알겠어요" onPress={onClose} />
        </PixelPanel>
      </View>
    </View>
  );
}
