import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';
import { type BonggingVerification } from '@/lib/bongging-reward';

type CertificationPopupProps = {
  result: BonggingVerification;
  onClose: () => void;
  onRetry: () => void;
};

export function CertificationPopup({ result, onClose, onRetry }: CertificationPopupProps) {
  const { scale } = useResponsive();
  const failure = result.status === 'failure';

  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: palette.dim, justifyContent: 'center', paddingHorizontal: scale(24) }}>
      <View style={{ backgroundColor: palette.white, borderRadius: scale(24), padding: scale(20), gap: scale(12) }}>
        <View style={{ width: scale(48), height: scale(48), borderRadius: scale(24), backgroundColor: failure ? palette.blush : palette.leafSoft, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name={failure ? 'close' : 'check'} size={scale(26)} color={failure ? palette.tangerineDeep : palette.leafDeep} />
        </View>
        <Text style={{ fontSize: scale(24), fontWeight: '800', color: palette.ink }}>{failure ? '인증 실패' : '인증 성공'}</Text>
        <Text style={{ color: palette.body, fontSize: scale(15), lineHeight: scale(22) }}>{result.message}</Text>
        {failure ? null : (
          <View style={{ gap: scale(8) }}>
            <RewardLine label="경험치" value={`+${result.xp}`} />
            <RewardLine label="섬 성장" value={`+${result.growthStacks}`} />
          </View>
        )}
        {failure ? (
          <View style={{ flexDirection: 'row', gap: scale(10) }}>
            <PopupButton label="닫기" tone="white" onPress={onClose} />
            <PopupButton label="다시 찍기" onPress={onRetry} />
          </View>
        ) : (
          <PopupButton label="결과 보기" onPress={onClose} />
        )}
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

function PopupButton({ label, onPress, tone = 'orange' }: { label: string; onPress: () => void; tone?: 'orange' | 'white' }) {
  const { scale } = useResponsive();
  const white = tone === 'white';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ flex: 1, alignSelf: 'stretch', minHeight: scale(52), borderRadius: scale(16), backgroundColor: white ? palette.white : palette.tangerine, alignItems: 'center', justifyContent: 'center', borderWidth: white ? 1 : 0, borderColor: palette.line }}>
      <Text style={{ color: white ? palette.ink : palette.white, fontSize: scale(16), fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}
