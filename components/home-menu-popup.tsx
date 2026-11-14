import { Image, type ImageSource } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { usePixelNotice } from '@/components/pixel-notice';
import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

const BUTTON_SIZE = 42;
const BUTTON_GAP = 6;
const MENU_ICON_SIZE = 42;
const OPEN_MS = 280;
const CLOSE_MS = 200;
const STAGGER_MS = 48;
const openEase = Easing.out(Easing.cubic);
const closeEase = Easing.in(Easing.cubic);
const CLOSE_SIZE = 22;
const DRAWN_FILL = '#D9C49B';
const DRAWN_BORDER = '#6B5A3E';
const RESET_ARROW = '#8B7355';

const CLOSE_PATTERN = ['X...X', '.X.X.', '..X..', '.X.X.', 'X...X'];
const RESET_PATTERN = ['.X.....', 'XXXXX..', '.X...X.', '......X', 'X.....X', 'X.....X', '.X...X.', '..XXX..'];

const profileIcon = require('@/assets/pixel/icon-profile.png') as ImageSource;
const settingsIcon = require('@/assets/pixel/icon-settings.png') as ImageSource;
const soundIcon = require('@/assets/pixel/icon-sound.png') as ImageSource;

export type HomeMenuActions = {
  onProfile?: () => void;
  onSettings?: () => void;
  onToggleSound?: () => void;
  soundOn?: boolean;
  onReset?: () => Promise<void> | void;
};

export type HomeMenuAnchor = { x: number; y: number };

export function HomeMenuPopup({
  open,
  anchor,
  onClose,
  onProfile,
  onSettings,
  onToggleSound,
  soundOn = true,
  onReset,
}: HomeMenuActions & {
  open: boolean;
  anchor: HomeMenuAnchor | null;
  onClose: () => void;
}) {
  const { scale } = useResponsive();
  const { width } = useWindowDimensions();
  const notice = usePixelNotice();
  const buttonSize = scale(BUTTON_SIZE);
  const gap = scale(BUTTON_GAP);
  const closeSize = scale(CLOSE_SIZE);
  const [shown, setShown] = useState(false);
  const closeProgress = useSharedValue(0);
  const profileProgress = useSharedValue(0);
  const settingsProgress = useSharedValue(0);
  const soundProgress = useSharedValue(0);
  const resetProgress = useSharedValue(0);
  const hasReset = Boolean(onReset);
  const iconSize = scale(MENU_ICON_SIZE);
  const iconCenterX = buttonSize + gap + iconSize / 2;
  const iconCenterY = iconSize / 2;
  const rowStep = buttonSize + gap;
  const firstRowY = closeSize + gap + buttonSize / 2;

  if (open && anchor && !shown) {
    setShown(true);
  }

  useEffect(() => {
    if (!shown) {
      return;
    }
    const values = hasReset
      ? [closeProgress, profileProgress, settingsProgress, soundProgress, resetProgress]
      : [closeProgress, profileProgress, settingsProgress, soundProgress];
    values.forEach((progress, index) => {
      const order = open ? index : values.length - 1 - index;
      progress.value = withDelay(
        order * STAGGER_MS,
        withTiming(open ? 1 : 0, {
          duration: open ? OPEN_MS : CLOSE_MS,
          easing: open ? openEase : closeEase,
        }),
      );
    });
    if (open) {
      return;
    }
    const timer = setTimeout(() => setShown(false), CLOSE_MS + STAGGER_MS * (values.length - 1) + 40);
    return () => clearTimeout(timer);
  }, [closeProgress, hasReset, open, profileProgress, resetProgress, settingsProgress, shown, soundProgress]);

  const showPending = (label: string) =>
    notice.show({ title: '준비 중', message: `${label}은(는) 준비 중이에요.` });

  const run = (label: string, action?: () => void) => {
    onClose();
    if (action) action();
    else showPending(label);
  };

  const confirmReset = () => {
    if (!onReset) return;
    onClose();
    notice.show({
      title: '데이터 초기화',
      message: '이 기기에 저장된 섬·경험치·걷기 기록을 모두 지울까요?',
      buttons: [
        { label: '취소' },
        {
          label: '초기화',
          onPress: () => {
            void (async () => {
              await onReset();
              notice.show({ title: '완료', message: '로컬 데이터를 초기화했어요.' });
            })();
          },
        },
      ],
    });
  };

  return (
    <>
      <Modal visible={shown && anchor != null} transparent animationType="none" onRequestClose={onClose}>
        <Pressable
          accessibilityLabel="메뉴 닫기"
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        {anchor ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: anchor.y,
              right: width - anchor.x + gap,
              alignItems: 'flex-start',
              gap,
            }}>
            <DropItem
              progress={closeProgress}
              fromX={iconCenterX - closeSize / 2}
              fromY={iconCenterY - closeSize / 2}
              interactive={open}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="메뉴 닫기"
                onPress={onClose}
                hitSlop={6}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                <DrawnFrame size={closeSize} border={scale(2)} bottom={scale(3)}>
                  <PixelGlyph pattern={CLOSE_PATTERN} cell={scale(2)} color={DRAWN_BORDER} />
                </DrawnFrame>
              </Pressable>
            </DropItem>

            <View style={{ gap }}>
              <DropItem
                progress={profileProgress}
                fromX={iconCenterX - buttonSize / 2}
                fromY={iconCenterY - firstRowY}
                interactive={open}>
                <MenuImageButton
                  label="프로필"
                  source={profileIcon}
                  size={buttonSize}
                  onPress={() => run('프로필', onProfile)}
                />
              </DropItem>
              <DropItem
                progress={settingsProgress}
                fromX={iconCenterX - buttonSize / 2}
                fromY={iconCenterY - (firstRowY + rowStep)}
                interactive={open}>
                <MenuImageButton
                  label="설정"
                  source={settingsIcon}
                  size={buttonSize}
                  onPress={() => run('설정', onSettings)}
                />
              </DropItem>
              <DropItem
                progress={soundProgress}
                fromX={iconCenterX - buttonSize / 2}
                fromY={iconCenterY - (firstRowY + rowStep * 2)}
                interactive={open}>
                <MenuImageButton
                  label={soundOn ? '소리 켜짐' : '소리 꺼짐'}
                  source={soundIcon}
                  size={buttonSize}
                  dimmed={!soundOn}
                  switchState={soundOn}
                  onPress={() => {
                    if (onToggleSound) onToggleSound();
                    else run('소리');
                  }}
                />
              </DropItem>
              {onReset ? (
                <DropItem
                  progress={resetProgress}
                  fromX={iconCenterX - buttonSize / 2}
                  fromY={iconCenterY - (firstRowY + rowStep * 3)}
                  interactive={open}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="데이터 초기화"
                    onPress={confirmReset}
                    style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                    <ResetIconButton size={buttonSize} />
                  </Pressable>
                </DropItem>
              ) : null}
            </View>
          </View>
        ) : null}
      </Modal>
      {notice.element}
    </>
  );
}

function DropItem({
  progress,
  fromX,
  fromY,
  interactive,
  children,
}: {
  progress: SharedValue<number>;
  fromX: number;
  fromY: number;
  interactive: boolean;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.25, 1], [0, 0.35, 1]),
    transform: [
      { translateX: (1 - progress.value) * fromX },
      { translateY: (1 - progress.value) * fromY },
      { scale: 0.72 + progress.value * 0.28 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents={interactive ? 'auto' : 'none'}
      accessibilityElementsHidden={!interactive}
      importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
      style={style}>
      {children}
    </Animated.View>
  );
}

function MenuImageButton({
  label,
  source,
  size,
  dimmed = false,
  switchState,
  onPress,
}: {
  label: string;
  source: ImageSource;
  size: number;
  dimmed?: boolean;
  switchState?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={switchState === undefined ? 'button' : 'switch'}
      accessibilityLabel={label}
      accessibilityState={switchState === undefined ? undefined : { checked: switchState }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        opacity: pressed ? 0.8 : dimmed ? 0.4 : 1,
      })}>
      <Image source={source} style={{ width: size, height: size, ...pixelImageStyle }} contentFit="contain" />
    </Pressable>
  );
}

function ResetIconButton({ size }: { size: number }) {
  const { scale } = useResponsive();

  return (
    <DrawnFrame size={size} border={scale(2)} bottom={scale(4)}>
      <PixelGlyph pattern={RESET_PATTERN} cell={scale(3)} color={RESET_ARROW} />
    </DrawnFrame>
  );
}

function DrawnFrame({
  size,
  border,
  bottom,
  children,
}: {
  size: number;
  border: number;
  bottom: number;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: DRAWN_FILL,
        borderWidth: border,
        borderBottomWidth: bottom,
        borderColor: DRAWN_BORDER,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {children}
    </View>
  );
}

function PixelGlyph({ pattern, cell, color }: { pattern: string[]; cell: number; color: string }) {
  return (
    <View>
      {pattern.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: 'row' }}>
          {row.split('').map((mark, colIndex) => (
            <View
              key={colIndex}
              style={{ width: cell, height: cell, backgroundColor: mark === 'X' ? color : 'transparent' }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
