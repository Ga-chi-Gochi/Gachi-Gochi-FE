import { Image, type ImageSource } from 'expo-image';
import { useCallback, useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { type SpotlightHole } from '@/components/guide/guide-spotlight';
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay';
import { gachiUi } from '@/constants/gachi-ui';
import { uiActions, uiButtons } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';

type ViewNode = ComponentRef<typeof View>;

const pixelImageStyle = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as const) : undefined;

type PracticeKind = 'walk' | 'plogging';

/** 튜토리얼: 실천 카드 고르기 → 시작허게 누르기 */
type TourPhase = 'pick' | 'start';

export type ValuePracticeTour = {
  kind: PracticeKind;
  step: number;
  total?: number;
  title: string;
  body: string;
  hint: string;
  onSkip: () => void;
};

type ValuePracticePopupProps = {
  open: boolean;
  onClose: () => void;
  onStart: (kind: PracticeKind) => void;
  /** 튜토리얼이면 해당 실천만 고르게 하고, 팝업 위에 안내를 띄운다 */
  tour?: ValuePracticeTour | null;
};

/** 와이어프레임: 오늘은 어떤 가치를 실천할까요? */
export function ValuePracticePopup({ open, onClose, onStart, tour = null }: ValuePracticePopupProps) {
  const { scale } = useResponsive();
  const [picked, setPicked] = useState<PracticeKind>('walk');
  const tourKey = open && tour ? tour.kind : null;
  const [tourGate, setTourGate] = useState<{ key: PracticeKind | null; phase: TourPhase }>({
    key: null,
    phase: 'pick',
  });
  // 투어가 바뀌면(봉그깅→걷기) 선택 단계부터 다시. props 변화에 맞춰 렌더 중 상태를 맞춘다
  if (tourGate.key !== tourKey) {
    setTourGate({ key: tourKey, phase: 'pick' });
  }
  const tourPhase: TourPhase = tourGate.key === tourKey ? tourGate.phase : 'pick';
  const cardRef = useRef<ViewNode>(null);
  const startRef = useRef<ViewNode>(null);
  const [focusHoles, setFocusHoles] = useState<SpotlightHole[]>([]);

  // 튜토리얼: 고르기 전에는 선택 표시 없음. 고른 뒤에는 안내하는 실천만 선택
  const selected: PracticeKind | null = tour ? (tourPhase === 'start' ? tour.kind : null) : picked;
  const detailKind = selected ?? tour?.kind ?? picked;

  const measureFocus = useCallback(() => {
    if (!tour) {
      setFocusHoles((current) => (current.length === 0 ? current : []));
      return;
    }
    const pad = scale(6);
    const target = tourPhase === 'pick' ? cardRef.current : startRef.current;
    if (!target) {
      setFocusHoles((current) => (current.length === 0 ? current : []));
      return;
    }
    target.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (width <= 0 || height <= 0) {
        setFocusHoles((current) => (current.length === 0 ? current : []));
        return;
      }
      const next: SpotlightHole[] = [
        {
          left: x - pad,
          top: y - pad,
          width: width + pad * 2,
          height: height + pad * 2,
          radius: tourPhase === 'pick' ? scale(10) : scale(8),
        },
      ];
      setFocusHoles((current) => (sameHoles(current, next) ? current : next));
    });
  }, [scale, tour, tourPhase]);

  useEffect(() => {
    if (!open || !tour) {
      return;
    }
    const id = requestAnimationFrame(measureFocus);
    return () => cancelAnimationFrame(id);
  }, [open, tourKey, tourPhase, measureFocus, tour]);

  if (!open) {
    return null;
  }

  const pick = (kind: PracticeKind) => {
    if (tour) {
      if (tour.kind !== kind || tourPhase !== 'pick') {
        return;
      }
      setPicked(kind);
      setTourGate({ key: tour.kind, phase: 'start' });
      return;
    }
    setPicked(kind);
  };

  const tourHint =
    tour && tourPhase === 'pick'
      ? tour.kind === 'plogging'
        ? '봉그깅을 눌러 보세요'
        : '걷기를 눌러 보세요'
      : tour
        ? '시작허게를 눌러 보세요'
        : undefined;

  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={tour ? tour.onSkip : onClose}>
      {/* 배경과 카드를 형제로 둬서 웹에서 <button> 중첩(nest) 오류가 나지 않게 한다 */}
      <View
        style={{
          flex: 1,
          backgroundColor: tour ? 'transparent' : 'rgba(61,46,34,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: scale(20),
        }}>
        {tour ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          onLayout={() => {
            if (tour) {
              requestAnimationFrame(measureFocus);
            }
          }}
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
            zIndex: 1,
          }}>
          <GalmuriText size={11} bold center>
            오늘은 어떤 가치를 실천할까요?
          </GalmuriText>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: scale(12) }}>
            <PracticeCard
              focusRef={tour?.kind === 'walk' ? cardRef : undefined}
              selected={selected === 'walk'}
              locked={Boolean(tour && (tour.kind !== 'walk' || tourPhase === 'start'))}
              source={selected === 'walk' ? uiActions.walkOn : uiActions.walkOff}
              label="걷기"
              onPress={() => pick('walk')}
              onLayout={tour?.kind === 'walk' ? measureFocus : undefined}
            />
            <PracticeCard
              focusRef={tour?.kind === 'plogging' ? cardRef : undefined}
              selected={selected === 'plogging'}
              locked={Boolean(tour && (tour.kind !== 'plogging' || tourPhase === 'start'))}
              source={selected === 'plogging' ? uiActions.plogOn : uiActions.plogOff}
              label="봉그깅"
              onPress={() => pick('plogging')}
              onLayout={tour?.kind === 'plogging' ? measureFocus : undefined}
            />
          </View>
          <GalmuriText size={9} color={gachiUi.inkSoft} center>
            {detailKind === 'walk' ? '걷기는 걸음 수로 자동 인증돼요' : '봉그깅은 사진으로 인증해요'}
          </GalmuriText>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: scale(10), marginTop: scale(4) }}>
            {tour ? null : (
              <AssetImageButton source={uiButtons.beigeClose} label="닫으게" width={60} height={20} onPress={onClose} />
            )}
            <View ref={startRef} collapsable={false} onLayout={tour ? measureFocus : undefined}>
              <AssetImageButton
                source={uiButtons.greenStart}
                label="시작허게"
                width={68}
                height={20}
                disabled={Boolean(tour && tourPhase === 'pick')}
                onPress={() => onStart(tour?.kind ?? picked)}
              />
            </View>
          </View>
        </View>
        {tour ? (
          <TutorialOverlay
            step={tour.step}
            total={tour.total}
            title={tour.title}
            body={tour.body}
            hint={tourHint ?? tour.hint}
            hole={focusHoles.length > 0 ? () => focusHoles : undefined}
            placement="above"
            blockOutside
            onSkip={tour.onSkip}
            zIndex={2}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function sameHoles(a: SpotlightHole[], b: SpotlightHole[]) {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((left, index) => {
    const right = b[index];
    if ('left' in left && 'left' in right) {
      return (
        left.left === right.left &&
        left.top === right.top &&
        left.width === right.width &&
        left.height === right.height &&
        left.radius === right.radius
      );
    }
    return false;
  });
}

function PracticeCard({
  focusRef,
  selected,
  locked = false,
  source,
  label,
  onPress,
  onLayout,
}: {
  focusRef?: RefObject<ViewNode | null>;
  selected: boolean;
  locked?: boolean;
  source: ImageSource;
  label: string;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { scale } = useResponsive();
  return (
    <View ref={focusRef} collapsable={false} onLayout={onLayout}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: locked }}
        accessibilityLabel={label}
        disabled={locked}
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
          opacity: locked ? 0.45 : 1,
        }}>
        <Image source={source} style={{ width: scale(58), height: scale(58), ...pixelImageStyle }} contentFit="contain" />
      </Pressable>
    </View>
  );
}
