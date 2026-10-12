const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return config;
  });

  config = withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      return config;
    }

    let contents = config.modResults.contents;
    contents = contents.replace(
      'class AppDelegate: ExpoAppDelegate {',
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    );
    contents = contents.replace(
      `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

`,
      '',
    );
    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withIosSceneLifecycle;
