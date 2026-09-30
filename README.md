# Gachi Gochi

Expo SDK 57 앱입니다. 개발은 폰의 Expo Go(SDK 57)로 하고, 스토어 배포는 EAS Build로 합니다.

## 요구 사항

- Node.js 22.23.3 (`.nvmrc`). 이 맥에는 `n`이 있으므로 `sudo n 22.23.3`으로 맞춥니다.
- npm만 사용합니다. `package-lock.json`을 커밋하고 yarn/pnpm lock은 만들지 않습니다.
- 폰의 Expo Go는 SDK 57이어야 합니다. 스토어에 설치된 최신 Expo Go가 이 버전입니다.

Git 줄바꿈은 레포의 `.gitattributes`가 LF로 맞춥니다. 각자 컴퓨터에서 한 번만 아래를 실행합니다.

```bash
git config --global core.autocrlf false
```

## 실행

```bash
npm install
npm start
```

QR이 다른 IP로 잡히면 `npx expo start --tunnel`로 엽니다. 윈도우에서 흔합니다.

- 맥: iOS 시뮬레이터, Android 에뮬레이터, 실기기 Expo Go
- 윈도우: Android 에뮬레이터, 실기기 Expo Go. iOS 시뮬레이터는 맥에서만 됩니다.

라이브러리는 `npx expo install <패키지>`로 추가합니다. 합치기 전에는 `npm run doctor`를 실행합니다.

## 환경 변수

`.env.example`을 `.env`로 복사해 값을 채웁니다. 앱에 들어갈 값은 `EXPO_PUBLIC_`로 시작합니다. `.env`는 커밋하지 않습니다.

## 배포

스토어에 올리는 파일은 EAS Build가 클라우드에서 만듭니다. 맥이 없어도 iOS 빌드가 됩니다. `ios`/`android` 폴더는 커밋하지 않습니다.

`app.json`의 번들 ID는 `com.gachigochi.app`입니다. 스토어에 올린 뒤에는 바꾸지 않습니다.

`eas.json` 프로필:

- `development`: development build. `expo-dev-client`를 넣은 뒤에 사용합니다.
- `preview`: 스토어 심사 없이 폰에 설치. Android는 APK입니다.
- `production`: App Store / Play 스토어 제출용. iOS `.ipa`, Android `.aab`를 만듭니다.

### 계정

- [Expo](https://expo.dev) 계정. 빌드를 올리는 곳입니다.
- Apple Developer Program(연 $99). 아이폰에 우리 앱을 설치하거나 App Store에 낼 때 필요합니다. Expo Go로 QR만 보는 것과는 별개입니다.
- Google Play Console(등록비 $25). Play 스토어에 낼 때 필요합니다. 테스트용 APK를 폰에 직접 깔 때는 없어도 됩니다.

### 폰에 깔아서 확인

Node 22.23.3에서 실행합니다.

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile preview
```

끝나면 나오는 링크의 APK를 안드로이드 폰에서 열면 설치됩니다.

아이폰 내부 설치는 Apple Developer 계정으로 그 기기를 등록한 뒤 같은 프로필로 빌드합니다.

```bash
npx eas-cli build --platform ios --profile preview
```

팀원 여러 명에게 나눠 줄 때는 아래 스토어용 iOS 빌드를 TestFlight로 보내는 편이 낫습니다.

### App Store / Play 스토어

```bash
npx eas-cli build --platform all --profile production
```

처음 실행하면 Apple, Google 서명 키를 EAS에 만들지 물어봅니다. 생성에 동의하면 됩니다.

빌드가 끝나면 제출합니다.

```bash
npx eas-cli submit --platform ios --profile production
npx eas-cli submit --platform android --profile production
```

- iOS: App Store Connect에 올라가고, 처리가 끝나면 TestFlight에서 설치할 수 있습니다. 스토어 공개는 App Store Connect에서 심사 제출을 따로 합니다.
- Android: Play Console 트랙으로 올라갑니다. 첫 앱은 Play Console에서 스토어 등록 정보와 콘텐츠 등급을 채운 뒤 출시합니다.
