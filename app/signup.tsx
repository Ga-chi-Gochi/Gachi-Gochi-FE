import { router } from 'expo-router';
import { TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetImageButton } from '@/components/gachi-ui/asset-image-button';
import { GalmuriText } from '@/components/gachi-ui/galmuri-text';
import { AUTH_ENABLED } from '@/constants/auth';
import { gachiUi } from '@/constants/gachi-ui';
import { uiButtons } from '@/constants/ui-assets';
import { useResponsive } from '@/hooks/use-responsive';

export default function SignupScreen() {
  const { scale } = useResponsive();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: gachiUi.cream,
        paddingTop: insets.top + scale(20),
        paddingBottom: insets.bottom + scale(16),
        paddingHorizontal: scale(24),
        gap: scale(10),
      }}>
      <GalmuriText size={14} bold center>
        회원가입
      </GalmuriText>
      <GalmuriText size={9} color={gachiUi.inkSoft} center>
        {AUTH_ENABLED
          ? '와이어프레임 기준으로 만든 화면이에요.'
          : '지금은 화면만 준비해 두었어요. 나중에 백엔드와 붙이면 여기로 들어오게 할 수 있어요.'}
      </GalmuriText>
      <Field label="닉네임" placeholder="닉네임을 입력하세요" editable={AUTH_ENABLED} />
      <Field label="전화번호" placeholder="010-0000-0000" editable={AUTH_ENABLED} keyboardType="phone-pad" />
      <Field label="이메일" placeholder="email@example.com" editable={AUTH_ENABLED} keyboardType="email-address" autoCapitalize="none" />
      <Field label="비밀번호" placeholder="비밀번호" editable={AUTH_ENABLED} secureTextEntry />
      <Field label="비밀번호 확인" placeholder="비밀번호 확인" editable={AUTH_ENABLED} secureTextEntry />
      <GalmuriText size={7} color={gachiUi.inkSoft}>
        (필수) 사용자 개인 정보 수집 동의
      </GalmuriText>
      <GalmuriText size={7} color={gachiUi.inkSoft}>
        (선택) 앱 푸쉬 알람 동의
      </GalmuriText>
      <View style={{ alignItems: 'center', gap: scale(10), marginTop: scale(8) }}>
        <AssetImageButton
          source={uiButtons.beigeSignup}
          label="회원가입허게"
          width={92}
          height={20}
          onPress={() => router.replace('/(tabs)')}
        />
        <AssetImageButton source={uiButtons.beigeClose} label="닫으게" width={60} height={20} onPress={() => router.back()} />
      </View>
    </View>
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
    <View style={{ gap: scale(4) }}>
      <GalmuriText size={9}>{label}</GalmuriText>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={gachiUi.inkSoft}
        editable={editable}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          minHeight: scale(44),
          backgroundColor: gachiUi.white,
          borderWidth: scale(gachiUi.border),
          borderColor: gachiUi.ink,
          borderRadius: scale(6),
          paddingHorizontal: scale(12),
          color: gachiUi.ink,
          fontFamily: 'Galmuri9',
          fontSize: scale(9),
        }}
      />
    </View>
  );
}
