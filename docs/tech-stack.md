# 사용 기술

가치고치 프론트엔드에서 쓰는 기술입니다. 버전은 `package.json`과 `app.json` 기준입니다.

## 런타임

| 항목 | 버전 |
| --- | --- |
| Node.js | 22.23.3 (`.nvmrc`, `package.json`은 22.13.0 이상) |
| TypeScript | 6.0 |
| React | 19.3 |
| React Native | 0.88 |
| 패키지 관리 | npm (`package-lock.json`) |

TypeScript는 `strict`이고, `@/`는 프로젝트 루트를 가리킵니다.

## 앱

Expo SDK 58로 iOS, Android, 웹을 한 코드베이스에서 만듭니다. 진입점은 `expo-router/entry`이고, 화면 파일은 `app/`에 있습니다.

- **Expo Router**: 파일 경로가 화면이 됩니다. 루트는 Stack, 홈 묶음은 `(tabs)`입니다.
- **React Compiler**: `app.json`의 `experiments.reactCompiler`로 켜 두었습니다.
- **정적 웹**: `web.output`이 `static`입니다. `npx expo export -p web` 결과가 `dist`이고, 이 폴더를 Vercel에 올립니다.

## 화면

스타일은 React Native `StyleSheet` 대신 컴포넌트 `style`에 직접 적습니다. 색은 `constants/palette.ts`, 너비 기준 배율은 `constants/layout.ts`와 `hooks/use-responsive.ts`입니다. 기준 너비는 390입니다.

- **expo-image**: 픽셀 타일과 캐릭터 이미지. 웹에서는 `imageRendering: pixelated`로 확대합니다.
- **@expo/vector-icons**: Material 아이콘.
- **react-native-reanimated**, **react-native-worklets**: 섬 맵 확대, 성장·보상 애니메이션.
- **react-native-gesture-handler**: 루트를 감싸 제스처를 받습니다.
- **react-native-safe-area-context**: 노치와 상태 표시줄에 가리지 않게 여백을 둡니다.
- **expo-linear-gradient**, **expo-haptics**, **expo-font**: 그라데이션, 진동, 글꼴.

## 기기 기능

네이티브 권한은 `app.json` 플러그인에 적혀 있고, `ios/`와 `android/` 폴더는 커밋하지 않습니다.

- **expo-camera**: 봉그깅 촬영과 카메라 전환.
- **expo-image-picker**: 갤러리에서 쓰레기 사진 선택.
- **expo-image-manipulator**: 판별에 보내기 전에 JPEG로 줄입니다. 긴 변은 1280px입니다.
- **expo-location**: 촬영 위치.
- **expo-network**, **expo-linking**, **expo-web-browser**: 네트워크 상태, 앱 링크, 외부 브라우저.

걸음 수는 아직 건강 앱과 연결하지 않았습니다. `lib/walking-api.ts`의 출처는 `mock`이고, HealthKit과 Health Connect는 이후 연동용 타입만 있습니다.

## 데이터

게임 진행은 서버 없이 기기에 둡니다. **@react-native-async-storage/async-storage**에 섬, 성장, 탐험, 걷기 보상을 JSON으로 저장합니다. 화면 간 상태는 `components/play-state.tsx`의 React Context입니다.

서버 주소가 비어 있으면 탐험(`lib/explore-api.ts`)과 걷기(`lib/walking-api.ts`)는 로컬 저장만 사용합니다. `EXPO_PUBLIC_API_URL`은 이후 백엔드용입니다.

## 외부 서비스

봉그깅 사진 판별은 **@google/genai**로 앱에서 바로 호출합니다. 모델은 `gemini-3.5-flash-lite`이고, 키는 `EXPO_PUBLIC_GEMINI_API_KEY`입니다. 이 값은 웹 번들에 포함되므로 테스트용입니다.

## 배포와 검사

- **웹**: Vercel. 빌드 명령은 `npx expo export -p web`, 출력은 `dist`, Node는 22입니다. 저장소 `main`에 연결합니다.
- **스토어**: EAS Build / EAS Submit (`eas.json`). 프로필은 `development`, `preview`(Android APK), `production`입니다. 번들 ID는 `com.gachigochi.app`입니다.
- **검사**: ESLint 9와 `eslint-config-expo`. `npx tsc --noEmit`, `npx expo lint`로 확인합니다.
