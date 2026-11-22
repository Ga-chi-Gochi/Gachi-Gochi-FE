import { Image, type ImageSource } from 'expo-image';
import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { gachiUi } from '@/constants/gachi-ui';
import { uiActions, uiButtons } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type PracticeKind = 'walk' | 'plogging';

type ValuePracticePopupProps = {
  open: boolean;
  onClose: () => void;
  onStart: (kind: PracticeKind) => void;
};

/** 와이어프레임: 오늘은 어떤 가치를 실천할까요? */
export function ValuePracticePopup({ open, onClose, onStart }: ValuePracticePopupProps) {
  const { scale } = useResponsive();
  const [selected, setSelected] = useState<PracticeKind>('walk');

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
          paddingHorizontal: scale(20),
        }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: scale(300),
            backgroundColor: gachiUi.panel,
            borderWidth: scale(gachiUi.border),
            borderColor: gachiUi.ink,
            borderRadius: scale(10),
            paddingHorizontal: scale(16),
            paddingTop: scale(18),
            paddingBottom: scale(14),
            gap: scale(12),
          }}>
          <GalmuriText size={11} bold center>
            오늘은 어떤 가치를 실천할까요?
          </GalmuriText>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: scale(12) }}>
            <PracticeCard
              selected={selected === 'walk'}
              source={selected === 'walk' ? uiActions.walkOn : uiActions.walkOff}
              label="걷기"
              onPress={() => setSelected('walk')}
            />
            <PracticeCard
              selected={selected === 'plogging'}
              source={selected === 'plogging' ? uiActions.plogOn : uiActions.plogOff}
              label="봉그깅"
              onPress={() => setSelected('plogging')}
            />
          </View>
          <GalmuriText size={9} color={gachiUi.inkSoft} center>
            {selected === 'walk' ? '걷기는 걸음 수로 자동 인증돼요' : '봉그깅은 사진으로 인증해요'}
          </GalmuriText>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: scale(10), marginTop: scale(4) }}>
            <AssetImageButton source={uiButtons.beigeClose} label="닫으게" width={60} height={20} onPress={onClose} />
            <AssetImageButton
              source={uiButtons.greenStart}
              label="시작허게"
              width={68}
              height={20}
              onPress={() => onStart(selected)}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PracticeCard({
  selected,
  source,
  label,
  onPress,
}: {
  selected: boolean;
  source: ImageSource;
  label: string;
  onPress: () => void;
}) {
  const { scale } = useResponsive();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: scale(96),
        height: scale(96),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: scale(gachiUi.border),
        borderColor: selected ? gachiUi.greenDeep : gachiUi.ink,
        backgroundColor: selected ? gachiUi.green : gachiUi.beige,
        borderRadius: scale(8),
        padding: scale(6),
      }}>
      <Image source={source} style={{ width: scale(58), height: scale(58), ...pixelImageStyle }} contentFit="contain" />
    </Pressable>
  );
}
