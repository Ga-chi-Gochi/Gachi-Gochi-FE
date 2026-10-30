import { router, type Href } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import { FigButton } from '@/components/fig-button';
import { FigScreen } from '@/components/fig-screen';
import { AUTH_ENABLED } from '@/constants/auth';
import { palette } from '@/constants/palette';
import { useResponsive } from '@/hooks/use-responsive';

export default function LoginScreen() {
  const { scale } = useResponsive();

  return (
    <FigScreen colors={['#FFF9F1', '#DDF0FB']}>
      <View style={{ flex: 1, paddingHorizontal: scale(24), paddingTop: scale(48), gap: scale(16) }}>
        <Text style={{ fontSize: scale(36), fontWeight: '800', color: palette.ink }}>가치고치</Text>
        <Text style={{ color: palette.muted, fontSize: scale(14), lineHeight: scale(20) }}>
          {AUTH_ENABLED ? '이메일과 비밀번호로 로그인해요.' : '백엔드 연동 전이라 지금은 홈으로 바로 들어갈 수 있어요.'}
        </Text>
        <TextInput
          accessibilityLabel="이메일"
          placeholder="이메일을 작성하세요."
          placeholderTextColor={palette.muted}
          editable={AUTH_ENABLED}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ minHeight: scale(52), borderRadius: scale(16), backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, paddingHorizontal: scale(16), color: palette.ink }}
        />
        <TextInput
          accessibilityLabel="비밀번호"
          placeholder="비밀번호를 입력하세요."
          placeholderTextColor={palette.muted}
          editable={AUTH_ENABLED}
          secureTextEntry
          style={{ minHeight: scale(52), borderRadius: scale(16), backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, paddingHorizontal: scale(16), color: palette.ink }}
        />
        <FigButton label={AUTH_ENABLED ? '로그인' : '홈으로 들어가기'} onPress={() => router.replace('/(tabs)')} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/signup' as Href)}>
          <Text style={{ textAlign: 'center', color: palette.body, fontWeight: '700' }}>회원가입</Text>
        </Pressable>
      </View>
    </FigScreen>
  );
}
