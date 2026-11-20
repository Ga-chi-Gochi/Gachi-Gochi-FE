import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';

import { GuideChoices, GuideSpeech } from '@/components/guide/guide-controls';
import { GuideSpotlight, holeBounds, type SpotlightHole } from '@/components/guide/guide-spotlight';
import { PixelButton, PixelText } from '@/components/pixel/pixel-ui';
import { useTutorial } from '@/components/tutorial/tutorial-provider';
import { pixel } from '@/constants/pixel-theme';
import { TUTORIAL_REWARD_COINS, TUTORIAL_TOTAL } from '@/constants/tutorial';
import { useResponsive } from '@/hooks/use-responsive';

export type OverlayBox = { width: number; height: number };

type TutorialOverlayProps = {
  /** 1부터 세는 현재 단계 */
  step: number;
  /** 기본은 전체 튜토리얼 장 수. 기능별 도움말은 1 */
  total?: number;
  title: string;
  body: string;
  /** 본문 아래에 한 줄 더 얹는 안내(예: 어느 버튼을 눌러야 하는지) */
  hint?: string;
  /** 화면 크기를 받아 구멍 하나를 돌려준다. 없으면 구멍 없이 전체를 어둡게 덮는다 */
  hole?: (box: OverlayBox) => SpotlightHole;
  /** 카드를 구멍 위·아래·화면 가운데 중 어디에 놓을지 */
  placement: 'above' | 'below' | 'center';
  /** above 일 때 꼬리가 가리킬 곳이 화면 오른쪽 끝에서 얼마나 떨어져 있는지. 없으면 가운데 */
  tailFromRight?: number;
  primary?: { label: string; onPress: () => void; disabled?: boolean };
  /** 구멍 밖 터치를 막을지. 홈 나침반 단계는 토글이 따로 막으므로 false */
  blockOutside?: boolean;
  /** 안드로이드 뒤로가기를 가로채 '정말 건너뛸까요?' 를 띄울지. 화면을 나가는 게 안내인 카메라·걷기 화면은 false */
  interceptBack?: boolean;
  onSkip: () => void;
  zIndex?: number;
};

const EDGE = 12;

/**
 * 튜토리얼 안내 한 장. 화면을 어둡게 덮고 눌러야 할 곳만 구멍으로 보여 준다.
 * 건너뛰기를 누르면 곧바로 닫지 않고 한 번 더 묻는다.
 */
export function TutorialOverlay({
  step,
  total = TUTORIAL_TOTAL,
  title,
  body,
  hint,
  hole,
  placement,
  tailFromRight,
  primary,
  blockOutside = true,
  interceptBack = true,
  onSkip,
  zIndex = 41,
}: TutorialOverlayProps) {
  const { scale } = useResponsive();
  const { rewardClaimed, replay, scope } = useTutorial();
  const [box, setBox] = useState<OverlayBox>({ width: 0, height: 0 });
  const [confirming, setConfirming] = useState(false);
  // 다시 보기·기능별 도움말·이미 보상 받은 경우는 보상 안내 없이 가볍게 묻는다
  const lightSkip = replay || scope !== 'full' || rewardClaimed;

  // 튜토리얼 도중 뒤로가기로 앱이 꺼지지 않게, 한 번 누르면 건너뛰기 확인을 열고 다시 누르면 닫는다
  useEffect(() => {
    if (!interceptBack) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setConfirming((current) => !current);
      return true;
    });
    return () => subscription.remove();
  }, [interceptBack]);

  const measured = box.width > 0;
  const target = measured && hole ? hole(box) : null;
  const bounds = target ? holeBounds(target) : null;

  const cardPosition =
    placement === 'above' && bounds
      ? ({ bottom: box.height - bounds.top + scale(6) } as const)
      : placement === 'below' && bounds
        ? ({ top: bounds.bottom + scale(12) } as const)
        : ({ top: 0, bottom: 0, justifyContent: 'center' } as const);
  const tailInset = placement === 'above' && tailFromRight !== undefined ? tailFromRight - scale(EDGE) : undefined;

  return (
    <View
      pointerEvents="box-none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex }}>
      {measured ? (
        <>
          {target ? (
            <GuideSpotlight width={box.width} height={box.height} holes={[target]} />
          ) : (
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: pixel.dim }} />
          )}
          {blockOutside ? <Blockers box={box} bounds={bounds} /> : null}
          <View
            pointerEvents="box-none"
            style={[
              { position: 'absolute', left: scale(EDGE), right: scale(EDGE), alignItems: tailInset !== undefined ? 'flex-end' : 'center' },
              cardPosition,
            ]}>
            <View style={{ width: '100%', maxWidth: scale(360) }}>
              <GuideSpeech tail={placement === 'above'} tailInset={tailInset}>
                {confirming ? (
                  <>
                    <PixelText size={18} center>
                      정말 건너뛸까요?
                    </PixelText>
                    <PixelText size={14} weight="500" center>
                      {lightSkip
                        ? '언제든 메뉴에서 다시 볼 수 있어요.'
                        : `끝까지 보면 귤 ${TUTORIAL_REWARD_COINS}개를 받아요. 건너뛰어도 메뉴에서 다시 볼 수 있어요.`}
                    </PixelText>
                    <GuideChoices large={false} left="건너뛰기" right="계속 보기" onLeft={onSkip} onRight={() => setConfirming(false)} />
                  </>
                ) : (
                  <>
                    <PixelText size={12} color={pixel.muted}>
                      {`${step} / ${total}`}
                    </PixelText>
                    <PixelText size={18} center>
                      {title}
                    </PixelText>
                    <PixelText size={14} weight="500" center>
                      {body}
                    </PixelText>
                    {hint ? (
                      // 버튼처럼 보이지 않도록 테두리 없이 옅은 띠로만 보여 준다
                      <View style={{ backgroundColor: 'rgba(26,21,32,0.08)', paddingVertical: scale(8), paddingHorizontal: scale(10) }}>
                        <PixelText size={13} center>
                          {hint}
                        </PixelText>
                      </View>
                    ) : null}
                    {primary ? <PixelButton label={primary.label} disabled={primary.disabled} onPress={primary.onPress} /> : null}
                    <PixelButton tone="ghost" label="건너뛰기" onPress={() => setConfirming(true)} />
                  </>
                )}
              </GuideSpeech>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

/** 구멍을 뺀 나머지 화면의 터치를 막는다. 구멍이 없으면 화면 전체를 막는다 */
function Blockers({ box, bounds }: { box: OverlayBox; bounds: ReturnType<typeof holeBounds> | null }) {
  const pieces = bounds
    ? [
        { top: 0, left: 0, width: box.width, height: Math.max(0, bounds.top) },
        { top: bounds.bottom, left: 0, width: box.width, height: Math.max(0, box.height - bounds.bottom) },
        { top: bounds.top, left: 0, width: Math.max(0, bounds.left), height: bounds.bottom - bounds.top },
        { top: bounds.top, left: bounds.right, width: Math.max(0, box.width - bounds.right), height: bounds.bottom - bounds.top },
      ]
    : [{ top: 0, left: 0, width: box.width, height: box.height }];
  return (
    <>
      {pieces.map((piece, index) => (
        <View key={index} onStartShouldSetResponder={() => true} style={{ position: 'absolute', ...piece }} />
      ))}
    </>
  );
}
