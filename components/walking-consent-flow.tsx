import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type ReactNode, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { FigButton } from '@/components/fig-button';
import { TopBar } from '@/components/top-bar';
import { PopupButton, PopupShell } from '@/components/walking-popup';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

// consent: 개인정보 수집 동의 화면 / warning: 동의 안 함 경고 팝업 / leaving: 떠날지 확인 팝업 / goodbye: 작별 화면
type ConsentStage = 'consent' | 'warning' | 'leaving' | 'goodbye';

type WalkingConsentFlowProps = {
  // 동의했을 때 불린다.
  onAgree: () => void;
  // 끝까지 동의하지 않고 작별 화면에서 '확인'을 눌렀을 때 불린다.
  onLeave: () => void;
  // 개발용 버튼 자리. 배포 빌드에서는 null을 넘긴다.
  devTools?: ReactNode;
};

// 건강 앱 접근을 거부한 사용자에게 보여 주는 흐름.
// 동의 화면 → (동의 안 함) 경고 팝업 → (그래도 안 함) 떠날지 확인 팝업 → (네) 작별 화면
export function WalkingConsentFlow({ onAgree, onLeave, devTools }: WalkingConsentFlowProps) {
  const { scale } = useResponsive();
  const [stage, setStage] = useState<ConsentStage>('consent');

  if (stage === 'goodbye') {
    return (
      <View style={{ flex: 1, paddingHorizontal: scale(24), paddingBottom: scale(8), gap: scale(14) }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(12) }}>
          <View style={{ width: scale(72), height: scale(72), borderRadius: scale(36), backgroundColor: palette.leafSoft, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="waving-hand" size={scale(34)} color={palette.leafDeep} />
          </View>
          <Text style={{ fontSize: scale(30), fontWeight: '800', color: palette.ink }}>다시 또 봐요</Text>
          <Text style={{ color: palette.muted, fontSize: scale(14), lineHeight: scale(20), textAlign: 'center' }}>마음이 바뀌면 언제든 다시 찾아와 주세요.</Text>
        </View>
        {devTools}
        <View style={{ flexDirection: 'row', gap: scale(10) }}>
          <FigButton label="뒤로가기" tone="white" onPress={() => setStage('leaving')} />
          <FigButton label="확인" onPress={onLeave} />
        </View>
      </View>
    );
  }

  return (
    <>
      <TopBar title="걷기" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: scale(24), paddingBottom: scale(16), gap: scale(14) }}>
        <Text style={{ fontSize: scale(26), fontWeight: '800', color: palette.ink }}>사용자 개인정보 수집 동의</Text>
        <Text style={{ fontSize: scale(14), color: palette.muted, lineHeight: scale(20) }}>
          건강 앱 접근이 허용되지 않았어요. 걸음으로 가치고치를 키우려면 아래 내용에 동의해 주세요.
        </Text>
        {/* [TODO: 기획 확인] 수집 항목·이용 목적·보관 기간 등 실제 동의 문구로 바꾼다. 지금 문구는 임시다. */}
        <View style={{ backgroundColor: palette.white, borderRadius: scale(24), padding: scale(18), gap: scale(10) }}>
          <ConsentLine label="수집 항목" value="오늘 걸음 수, 걸은 거리" />
          <ConsentLine label="이용 목적" value="걷기 보상 지급" />
        </View>
        {/* [TODO: 기획 확인] 폰 설정에서 건강 권한을 다시 켜야 하는 경우의 '설정에서 다시 허용하는 방법' 안내 문구 자리. */}
        {/* 기기(iOS/Android)별 실제 경로와, 설정 화면으로 바로 보내는 버튼을 둘지 확인이 필요하다. 지금 문구는 임시다. */}
        <View style={{ backgroundColor: palette.seaSoft, borderRadius: scale(24), padding: scale(18), gap: scale(6) }}>
          <Text style={{ color: palette.ink, fontSize: scale(14), fontWeight: '800' }}>설정에서 다시 허용하는 방법</Text>
          <Text style={{ color: palette.body, fontSize: scale(13), lineHeight: scale(19) }}>휴대폰 설정에서 건강 앱 접근을 다시 켤 수 있어요. 자세한 방법은 곧 안내할게요.</Text>
        </View>
        {devTools}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: scale(10), paddingHorizontal: scale(24), marginBottom: scale(8) }}>
        <FigButton label="동의 안 함" tone="white" onPress={() => setStage('warning')} />
        <FigButton label="동의" onPress={onAgree} />
      </View>
      {stage === 'warning' ? (
        <PopupShell icon="priority-high" title="잠깐만요!" message="동의하지 않으면 다마고치를 키울 수 없어요!" onBack={() => setStage('consent')}>
          <PopupButton label="다시 동의하기" onPress={() => setStage('consent')} />
          <PopupButton label="그래도 안 할래요" tone="white" onPress={() => setStage('leaving')} />
        </PopupShell>
      ) : stage === 'leaving' ? (
        <PopupShell icon="logout" title="정말로 떠나실 건가요?" message="가치고치가 기다리고 있어요." onBack={() => setStage('warning')}>
          {/* [TODO: 그림] 가치고치의 귀여운 모습이 들어갈 자리. 지금은 빈 칸만 잡아 둔다. */}
          <View style={{ height: scale(120), borderRadius: scale(16), backgroundColor: palette.mist }} />
          <PopupButton label="아니요" onPress={() => setStage('consent')} />
          <PopupButton label="네" tone="white" onPress={() => setStage('goodbye')} />
        </PopupShell>
      ) : null}
    </>
  );
}

function ConsentLine({ label, value }: { label: string; value: string }) {
  const { scale } = useResponsive();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: scale(12) }}>
      <Text style={{ color: palette.muted, fontSize: scale(14), fontWeight: '700' }}>{label}</Text>
      <Text style={{ flex: 1, color: palette.ink, fontSize: scale(14), fontWeight: '700', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}
