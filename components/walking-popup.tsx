import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type ComponentProps, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/palette';
import { WALKING_REWARD_LABELS, type WalkingDrops } from '@/constants/walking-reward';
import { useResponsive } from '@/hooks/use-responsive';

// 처음 들어온 사용자에게 순서대로 보여 주는 설명 팝업 문구.
export const WALKING_INTRO_MESSAGES = [
  `걷기를 진행하면 ${WALKING_REWARD_LABELS.oxygen}과 ${WALKING_REWARD_LABELS.water}이 생겨요! ${WALKING_REWARD_LABELS.oxygen}은 탄소를 제거하고, ${WALKING_REWARD_LABELS.water}은 가치고치들을 성장시킨답니다.`,
  '가치고치들이 자라면 씨앗을 심고 나무를 키울 수 있어요. 귤은 가치고치 세계의 화폐예요!',
];

type WalkingRewardPopupProps = {
  distanceMeters: number;
  reward: WalkingDrops;
  onClose: () => void;
};

export function WalkingRewardPopup({ distanceMeters, reward, onClose }: WalkingRewardPopupProps) {
  const { scale } = useResponsive();

  return (
    <PopupShell icon="check" title="걷기 보상 도착!" message={`오늘은 ${distanceMeters.toLocaleString('ko-KR')}미터 걸었네요!`}>
      {/* [TODO: 애니메이션] '공간이 정화되고 고치들이 자라는 애니메이션'이 들어갈 자리. 지금은 빈 칸만 잡아 둔다. */}
      <View style={{ height: scale(96), borderRadius: scale(16), backgroundColor: palette.leafSoft, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name="auto-awesome" size={scale(28)} color={palette.leaf} />
      </View>
      <View style={{ gap: scale(8) }}>
        <RewardLine label={WALKING_REWARD_LABELS.oxygen} value={`+${reward.oxygen}`} />
        <RewardLine label={WALKING_REWARD_LABELS.water} value={`+${reward.water}`} />
      </View>
      <PopupButton label="확인" onPress={onClose} />
    </PopupShell>
  );
}

type WalkingIntroPopupProps = {
  step: number;
  onNext: () => void;
};

export function WalkingIntroPopup({ step, onNext }: WalkingIntroPopupProps) {
  const last = step >= WALKING_INTRO_MESSAGES.length - 1;

  return (
    <PopupShell icon="directions-walk" title={`걷기 안내 ${step + 1}/${WALKING_INTRO_MESSAGES.length}`} message={WALKING_INTRO_MESSAGES[step]}>
      <PopupButton label={last ? '시작하기' : '다음'} onPress={onNext} />
    </PopupShell>
  );
}

// 봉그깅 인증 팝업(CertificationPopup)과 비슷한 모양으로 맞춘 틀. 그 파일을 가져다 쓰지 않고 여기서 직접 그린다.
// onBack을 넘기면 팝업 맨 위에 '뒤로가기' 버튼이 생긴다.
export function PopupShell({
  icon,
  title,
  message,
  onBack,
  children,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  message: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const { scale } = useResponsive();

  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: palette.dim, justifyContent: 'center', paddingHorizontal: scale(24) }}>
      <View style={{ backgroundColor: palette.white, borderRadius: scale(24), padding: scale(20), gap: scale(12) }}>
        {onBack ? (
          <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
            <MaterialIcons name="arrow-back" size={scale(18)} color={palette.muted} />
            <Text style={{ color: palette.muted, fontSize: scale(14), fontWeight: '700' }}>뒤로가기</Text>
          </Pressable>
        ) : null}
        <View style={{ width: scale(48), height: scale(48), borderRadius: scale(24), backgroundColor: palette.leafSoft, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name={icon} size={scale(26)} color={palette.leafDeep} />
        </View>
        <Text style={{ fontSize: scale(24), fontWeight: '800', color: palette.ink }}>{title}</Text>
        <Text style={{ color: palette.body, fontSize: scale(15), lineHeight: scale(22) }}>{message}</Text>
        {children}
      </View>
    </View>
  );
}

function RewardLine({ label, value }: { label: string; value: string }) {
  const { scale } = useResponsive();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: palette.mist, borderRadius: scale(14), paddingHorizontal: scale(14), paddingVertical: scale(10) }}>
      <Text style={{ color: palette.body, fontWeight: '700', fontSize: scale(14) }}>{label}</Text>
      <Text style={{ color: palette.ink, fontWeight: '800', fontSize: scale(16) }}>{value}</Text>
    </View>
  );
}

export function PopupButton({ label, onPress, tone = 'orange' }: { label: string; onPress: () => void; tone?: 'orange' | 'white' }) {
  const { scale } = useResponsive();
  const white = tone === 'white';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ alignSelf: 'stretch', minHeight: scale(52), borderRadius: scale(16), backgroundColor: white ? palette.white : palette.tangerine, alignItems: 'center', justifyContent: 'center', borderWidth: white ? 1 : 0, borderColor: palette.line }}>
      <Text style={{ color: white ? palette.ink : palette.white, fontSize: scale(16), fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}