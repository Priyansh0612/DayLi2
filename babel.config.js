module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Add the plugins array below
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};