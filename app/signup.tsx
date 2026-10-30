import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import { FigButton } from '@/components/fig-button';
import { FigScreen } from '@/components/fig-screen';
import { AUTH_ENABLED } from '@/constants/auth';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

export default function SignupScreen() {
  const { scale } = useResponsive();

  return (
    <FigScreen colors={['#FFF9F1', '#FFE3C7']}>
      <View style={{ flex: 1, paddingHorizontal: scale(24), paddingTop: scale(36), gap: scale(12) }}>
        <Text style={{ fontSize: scale(32), fontWeight: '800', color: palette.ink }}>회원가입</Text>
        <Text style={{ color: palette.muted, fontSize: scale(14), lineHeight: scale(20) }}>
          {AUTH_ENABLED ? '와이어프레임 기준으로 만든 화면이에요. 백엔드 연동 후 실제로 가입돼요.' : '지금은 화면만 준비해 두었어요. 나중에 백엔드와 붙이면 여기로 들어오게 할 수 있어요.'}
        </Text>
        <Field label="User name" placeholder="닉네임을 입력하세요" editable={AUTH_ENABLED} />
        <Field label="Phone number" placeholder="010-0000-0000" editable={AUTH_ENABLED} keyboardType="phone-pad" />
        <Field label="E-Mail Address" placeholder="email@example.com" editable={AUTH_ENABLED} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Password" placeholder="비밀번호" editable={AUTH_ENABLED} secureTextEntry />
        <Field label="Confirm password" placeholder="비밀번호 확인" editable={AUTH_ENABLED} secureTextEntry />
        <Text style={{ color: palette.body, fontSize: scale(12) }}>(필수) 사용자 개인 정보 수집 동의 · 약관 보기</Text>
        <Text style={{ color: palette.body, fontSize: scale(12) }}>(선택) 앱 푸쉬 알람 동의 · 약관 보기</Text>
        <FigButton label={AUTH_ENABLED ? '회원가입' : '홈으로 들어가기'} onPress={() => router.replace('/(tabs)')} />
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={{ textAlign: 'center', color: palette.body, fontWeight: '700' }}>로그인으로</Text>
        </Pressable>
      </View>
    </FigScreen>
  );
}

function Field({
  label,
  placeholder,
  editable,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  placeholder: string;
  editable: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
}) {
  const { scale } = useResponsive();

  return (
    <View style={{ gap: scale(6) }}>
      <Text style={{ color: palette.ink, fontWeight: '700', fontSize: scale(13) }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        editable={editable}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{ minHeight: scale(48), borderRadius: scale(14), backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, paddingHorizontal: scale(14), color: palette.ink }}
      />
    </View>
  );
}
