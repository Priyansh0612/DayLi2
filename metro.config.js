const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// THE STABILITY FIX: Enable modern package exports support for Expo SDK 54 / React Native 0.81
// This resolves the "@ungap/structured-clone" error and modern JS polyfills.
config.resolver.unstable_enablePackageExports = true;
config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs", "cjs"];

// THE SURGICAL PATCH: Manually resolve the internal files of @ungap/structured-clone 
// which are missing from its own package.json exports map.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.includes('@ungap/structured-clone')) {
        // If it's a relative require inside the package, help Metro find it
        if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
            return context.resolveRequest(context, moduleName, platform);
        }
    }
    return originalResolveRequest ? originalResolveRequest(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });