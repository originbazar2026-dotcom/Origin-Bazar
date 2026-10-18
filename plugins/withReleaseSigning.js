// Expo config plugin: sign Android release builds with Origin Bazar's own upload key
// when these environment variables are present at build time:
//   OB_KEYSTORE_PATH, OB_KEYSTORE_PASSWORD, OB_KEY_ALIAS, OB_KEY_PASSWORD
// Without them the build still works (signed with the debug key) so nothing ever fails.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// origin-bazar-release-signing';

const SIGNING_BLOCK = `
        ${MARKER}
        release {
            if (System.getenv('OB_KEYSTORE_PATH')) {
                storeFile file(System.getenv('OB_KEYSTORE_PATH'))
                storePassword System.getenv('OB_KEYSTORE_PASSWORD')
                keyAlias System.getenv('OB_KEY_ALIAS')
                keyPassword System.getenv('OB_KEY_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;

    // 1. add a "release" signing config after the debug one
    src = src.replace(
      /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/,
      `$1${SIGNING_BLOCK}`
    );

    // 2. use it for release builds when the keystore is provided
    src = src.replace(
      /(release\s*\{[^{}]*?)signingConfig signingConfigs\.debug/,
      `$1signingConfig System.getenv('OB_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug`
    );

    cfg.modResults.contents = src;
    return cfg;
  });
};
