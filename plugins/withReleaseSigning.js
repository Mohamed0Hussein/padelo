const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs local release builds with your own upload key instead of the debug key.
 * The key's location and passwords come from Gradle properties, normally in
 * ~/.gradle/gradle.properties (outside the repo, so they are never committed):
 *
 *   PADELO_UPLOAD_STORE_FILE=C:/Users/you/keys/padelo-upload.jks
 *   PADELO_UPLOAD_STORE_PASSWORD=...
 *   PADELO_UPLOAD_KEY_ALIAS=padelo
 *   PADELO_UPLOAD_KEY_PASSWORD=...
 *
 * Without them the release build falls back to the debug key, so it still builds.
 */
const MARK = '// padelo: release signing';

const RELEASE_CONFIG = `
        release {
            ${MARK}
            if (project.hasProperty('PADELO_UPLOAD_STORE_FILE')) {
                storeFile file(PADELO_UPLOAD_STORE_FILE)
                storePassword PADELO_UPLOAD_STORE_PASSWORD
                keyAlias PADELO_UPLOAD_KEY_ALIAS
                keyPassword PADELO_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARK)) return cfg;
    // add a release signing config next to the debug one
    src = src.replace(/(signingConfigs \{\s*debug \{[^}]*\})/, `$1${RELEASE_CONFIG}`);
    // use it for release builds when the key is configured
    src = src.replace(
      /(release \{\s*\/\/ Caution![^\n]*\n[^\n]*\n\s*)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('PADELO_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    if (!src.includes(MARK) || !src.includes('signingConfigs.release :')) {
      throw new Error('withReleaseSigning: android/app/build.gradle did not match the expected template');
    }
    cfg.modResults.contents = src;
    return cfg;
  });
