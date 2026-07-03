const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

const WEB_FALLBACKS = {
  platform: path.resolve(__dirname, 'src/shims/ReactNativePlatform.web.js'),
  legacyA11yEvent: path.resolve(__dirname, 'src/shims/legacySendAccessibilityEvent.web.js'),
  platformColorValueTypes: path.resolve(
    __dirname,
    'src/shims/PlatformColorValueTypes.web.js'
  ),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromReactNativeLibraries = context.originModulePath.includes(
    path.join('react-native', 'Libraries')
  );

  if (
    fromReactNativeLibraries &&
    (moduleName.endsWith('/Utilities/Platform') || moduleName === './Utilities/Platform')
  ) {
    return {
      type: 'sourceFile',
      filePath: WEB_FALLBACKS.platform,
    };
  }

  if (
    fromReactNativeLibraries &&
    (moduleName.endsWith('/PlatformColorValueTypes') || moduleName === './PlatformColorValueTypes')
  ) {
    return {
      type: 'sourceFile',
      filePath: WEB_FALLBACKS.platformColorValueTypes,
    };
  }

  if (fromReactNativeLibraries && moduleName.endsWith('/legacySendAccessibilityEvent')) {
    return {
      type: 'sourceFile',
      filePath: WEB_FALLBACKS.legacyA11yEvent,
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
