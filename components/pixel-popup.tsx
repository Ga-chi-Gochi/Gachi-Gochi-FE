import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { POPUP_BUTTON_COLORS, POPUP_COLORS, POPUP_DOT, POPUP_IMAGE_BUTTON, POPUP_MAX_WIDTH } from '@/constants/pixel-popup';
import { useResponsive } from '@/hooks/use-responsive';

type Steps = readonly (readonly [number, number])[];
type Inset = readonly [number, number, number, number];
type Layer = { color: string; inset: Inset; steps: Steps };

const OUTER: Steps = [[0, 4], [1, 2], [2, 1], [4, 0]];
const MIDDLE: Steps = [[0, 3], [1, 1], [3, 0]];
const INNER: Steps = [[0, 2], [1, 1], [2, 0]];
const SMALL: Steps = [[0, 1], [1, 0]];
const SQUARE: Steps = [[0, 0]];

const FRAME_LAYERS: Layer[] = [
  { color: POPUP_COLORS.outline, inset: [0, 0, 0, 0], steps: OUTER },
  { color: POPUP_COLORS.frameLight, inset: [1, 1, 1, 1], steps: MIDDLE },
  { color: POPUP_COLORS.frameDark, inset: [2, 1, 1, 1], steps: MIDDLE },
  { color: POPUP_COLORS.frame, inset: [2, 1, 2, 1], steps: MIDDLE },
  { color: POPUP_COLORS.outline, inset: [4, 4, 4, 4], steps: INNER },
  { color: POPUP_COLORS.fillLight, inset: [5, 5, 5, 5], steps: SMALL },
  { color: POPUP_COLORS.fillSide, inset: [6, 5, 5, 5], steps: SQUARE },
  { color: POPUP_COLORS.fillDark, inset: [6, 5, 5, 6], steps: SQUARE },
  { color: POPUP_COLORS.fill, inset: [6, 5, 6, 6], steps: SQUARE },
];

const FRAME_EDGE = 6;
const BUTTON_DOTS = 20;
const BUTTON_PRESS = 2;
const BUTTON_BASE = 3;

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

function PixelLayers({ layers, dot, offsetTop = 0, offsetBottom = 0 }: { layers: Layer[]; dot: number; offsetTop?: number; offsetBottom?: number }) {
  return (
    <>
      {layers.map((layer, layerIndex) =>
        layer.steps.map(([dy, dx]) => (
          <View
            key={`${layerIndex}-${dy}-${dx}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: (offsetTop + layer.inset[0] + dy) * dot,
              right: (layer.inset[1] + dx) * dot,
              bottom: (offsetBottom + layer.inset[2] + dy) * dot,
              left: (layer.inset[3] + dx) * dot,
              backgroundColor: layer.color,
            }}
          />
        )),
      )}
    </>
  );
}

export function PixelPopupFrame({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { scale } = useResponsive();
  const dot = scale(POPUP_DOT);

  return (
    <View style={[{ alignSelf: 'stretch' }, style]}>
      <PixelLayers layers={FRAME_LAYERS} dot={dot} />
      <View style={{ padding: FRAME_EDGE * dot + scale(12), gap: scale(10) }}>{children}</View>
    </View>
  );
}

export function PixelPopupOverlay({ children, onBackdropPress }: { children: ReactNode; onBackdropPress?: () => void }) {
  const { scale } = useResponsive();

  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(20) }}>
      <Pressable
        accessibilityLabel="닫기"
        disabled={!onBackdropPress}
        onPress={onBackdropPress}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: POPUP_COLORS.dim }}
      />
      <View style={{ width: '100%', maxWidth: scale(POPUP_MAX_WIDTH) }}>{children}</View>
    </View>
  );
}

export function PixelPopupTitle({ children }: { children: ReactNode }) {
  const { scale } = useResponsive();

  return <Text style={{ color: POPUP_COLORS.text, fontSize: scale(19), lineHeight: scale(26), fontWeight: '800', textAlign: 'center' }}>{children}</Text>;
}

export function PixelPopupMessage({ children }: { children: ReactNode }) {
  const { scale } = useResponsive();

  return <Text style={{ color: POPUP_COLORS.text, fontSize: scale(15), lineHeight: scale(22), fontWeight: '600', textAlign: 'center' }}>{children}</Text>;
}

export function PixelPopupActions({ children }: { children: ReactNode }) {
  const { scale } = useResponsive();

  return <View style={{ flexDirection: 'row', justifyContent: 'center', gap: scale(10), marginTop: scale(4) }}>{children}</View>;
}

const IMAGE_BUTTONS = {
  next: { label: '넘어가게', idle: require('@/assets/pixel/btn-green-next.png'), pressed: null },
  confirm: {
    label: '알았수다',
    idle: require('@/assets/pixel/btn-green-confirm.png'),
    pressed: require('@/assets/pixel/btn-green-confirm-pressed.png'),
  },
} as const;

export function PixelImageButton({ kind, onPress, accessibilityHint }: { kind: keyof typeof IMAGE_BUTTONS; onPress: () => void; accessibilityHint?: string }) {
  const { scale } = useResponsive();
  const art = IMAGE_BUTTONS[kind];
  const width = scale(POPUP_IMAGE_BUTTON.width);
  const height = scale(POPUP_IMAGE_BUTTON.height);
  const press = scale(POPUP_DOT * BUTTON_PRESS);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={art.label} accessibilityHint={accessibilityHint} onPress={onPress} hitSlop={6}>
      {({ pressed }) => (
        <View style={{ width, height, overflow: 'hidden' }}>
          <Image
            source={pressed && art.pressed ? art.pressed : art.idle}
            contentFit="fill"
            transition={0}
            style={{ width, height, transform: [{ translateY: pressed && !art.pressed ? press : 0 }], ...pixelImageStyle }}
          />
        </View>
      )}
    </Pressable>
  );
}

function buttonLayers(tone: keyof typeof POPUP_BUTTON_COLORS): { base: Layer[]; body: Layer[] } {
  const colors = POPUP_BUTTON_COLORS[tone];
  return {
    base: [
      { color: POPUP_COLORS.outline, inset: [0, 0, 0, 0], steps: MIDDLE },
      { color: colors.base, inset: [1, 1, 0, 1], steps: SMALL },
    ],
    body: [
      { color: POPUP_COLORS.outline, inset: [0, 0, 0, 0], steps: MIDDLE },
      { color: colors.light, inset: [1, 1, 1, 1], steps: SMALL },
      { color: colors.dark, inset: [2, 1, 1, 1], steps: SMALL },
      { color: colors.fill, inset: [2, 1, 2, 1], steps: SQUARE },
    ],
  };
}

export function PixelPopupButton({
  label,
  onPress,
  tone = 'green',
}: {
  label: string;
  onPress: () => void;
  tone?: keyof typeof POPUP_BUTTON_COLORS;
}) {
  const { scale } = useResponsive();
  const dot = scale(POPUP_DOT);
  const colors = POPUP_BUTTON_COLORS[tone];
  const layers = buttonLayers(tone);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={{ flex: 1, maxWidth: scale(160) }}>
      {({ pressed }) => {
        const top = pressed ? BUTTON_PRESS : 0;
        const bottom = pressed ? 0 : BUTTON_BASE;
        return (
          <View style={{ height: BUTTON_DOTS * dot }}>
            {pressed ? null : <PixelLayers layers={layers.base} dot={dot} />}
            <PixelLayers layers={layers.body} dot={dot} offsetTop={top} offsetBottom={bottom} />
            <View style={{ position: 'absolute', top: top * dot, bottom: bottom * dot, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(8) }}>
              <Text
                numberOfLines={1}
                style={{
                  color: colors.text,
                  fontSize: scale(15),
                  fontWeight: '800',
                  textShadowColor: colors.textShadow,
                  textShadowOffset: { width: 0, height: dot / 2 },
                  textShadowRadius: 0,
                }}>
                {label}
              </Text>
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}
