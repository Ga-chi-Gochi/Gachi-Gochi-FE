import { type ReactNode } from 'react';
import { Modal, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { GachiButton } from '@/components/gachi-ui/gachi-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { gachiUi } from '@/constants/gachi-ui';
import { useResponsive } from '@/hooks/use-responsive';

type GachiPopupProps = {
  open: boolean;
  title: string;
  body?: string;
  children?: ReactNode;
  onClose?: () => void;
  /** 왼쪽(베이지) / 오른쪽(초록) — 없으면 children 만 */
  secondaryLabel?: string;
  primaryLabel?: string;
  onSecondary?: () => void;
  onPrimary?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** 프레임 + 갈무리 문구 + 버튼 조합 팝업 (에셋 통짜 PNG 대신 조립) */
export function GachiPopup({
  open,
  title,
  body,
  children,
  onClose,
  secondaryLabel,
  primaryLabel,
  onSecondary,
  onPrimary,
  style,
}: GachiPopupProps) {
  const { scale } = useResponsive();
  const border = scale(gachiUi.border);
  const radius = scale(8);

  if (!open) {
    return null;
  }

  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(61,46,34,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: scale(24),
        }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            {
              width: '100%',
              maxWidth: scale(280),
              backgroundColor: gachiUi.panel,
              borderWidth: border,
              borderColor: gachiUi.ink,
              borderRadius: radius,
              paddingHorizontal: scale(16),
              paddingTop: scale(18),
              paddingBottom: scale(14),
              gap: scale(10),
            },
            style,
          ]}>
          <GalmuriText size={14} bold center>
            {title}
          </GalmuriText>
          {body ? (
            <GalmuriText size={9} color={gachiUi.inkSoft} center>
              {body}
            </GalmuriText>
          ) : null}
          {children}
          {secondaryLabel || primaryLabel ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: scale(10), marginTop: scale(4) }}>
              {secondaryLabel ? (
                <GachiButton label={secondaryLabel} tone="beige" onPress={onSecondary ?? onClose ?? (() => undefined)} />
              ) : null}
              {primaryLabel ? (
                <GachiButton label={primaryLabel} tone="green" onPress={onPrimary ?? (() => undefined)} />
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type MenuItem = {
  key: string;
  label: string;
  onPress: () => void;
};

type GachiMenuPanelProps = {
  items: MenuItem[];
  style?: StyleProp<ViewStyle>;
};

/** menu-panel 에셋 톤의 리스트 메뉴 (문구는 갈무리) */
export function GachiMenuPanel({ items, style }: GachiMenuPanelProps) {
  const { scale } = useResponsive();
  const border = scale(gachiUi.border);
  const radius = scale(8);

  return (
    <View
      style={[
        {
          minWidth: scale(100),
          backgroundColor: gachiUi.beigeDeep,
          borderWidth: border,
          borderColor: gachiUi.ink,
          borderRadius: radius,
          paddingVertical: scale(4),
          overflow: 'hidden',
        },
        style,
      ]}>
      {items.map((item, index) => (
        <View key={item.key}>
          {index > 0 ? (
            <View
              style={{
                height: scale(1),
                marginHorizontal: scale(8),
                backgroundColor: gachiUi.inkSoft,
                opacity: 0.55,
              }}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={item.onPress}
            style={({ pressed }) => ({
              paddingHorizontal: scale(12),
              paddingVertical: scale(8),
              backgroundColor: pressed ? 'rgba(61,46,34,0.08)' : 'transparent',
            })}>
            <GalmuriText size={9}>{item.label}</GalmuriText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

type GachiToastProps = {
  message: string;
  style?: StyleProp<ViewStyle>;
};

export function GachiToast({ message, style }: GachiToastProps) {
  const { scale } = useResponsive();
  return (
    <View
      style={[
        {
          alignSelf: 'center',
          backgroundColor: gachiUi.beige,
          borderWidth: scale(gachiUi.border),
          borderColor: gachiUi.ink,
          borderRadius: scale(10),
          paddingHorizontal: scale(14),
          paddingVertical: scale(6),
        },
        style,
      ]}>
      <GalmuriText size={9} center>
        {message}
      </GalmuriText>
    </View>
  );
}
