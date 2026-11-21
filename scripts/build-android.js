#!/usr/bin/env node
/**
 * Builds a signed release APK on this machine (no EAS Build quota).
 * Usage: npm run build:android            -> APK, for installing directly
 *        npm run build:android -- --aab   -> app bundle, for the Play Store
 *
 * Runs `expo prebuild` (which may recreate android/ when native config changes),
 * restores android/local.properties if needed, then Gradle.
 * Signing: see plugins/withReleaseSigning.js.
 *
 * Windows: native libraries compile to paths that contain the project folder twice, and the
 * Android NDK's build tool fails past 260 characters. Keep the project in a short folder
 * such as C:\dev\padelo. (Mapping a drive letter does not help: Node resolves it back.)
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const android = path.join(root, 'android');
const aab = process.argv.includes('--aab');
const win = process.platform === 'win32';
const MAX_WIN_ROOT = 20; // ponytail: rough limit measured with react-native-worklets; adjust if a deeper lib fails

const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: win });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (win && root.length > MAX_WIN_ROOT && !process.argv.includes('--force')) {
  console.error(
    `The project path is ${root.length} characters (${root}).\n` +
      `Native release builds on Windows fail on long paths. Move the project to a short folder,\n` +
      `e.g. C:\\dev\\padelo, then run npm ci there. Add -- --force to try anyway.`,
  );
  process.exit(1);
}

run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], root);

// Gradle needs the SDK location; keep an existing local.properties, else write one.
const localProps = path.join(android, 'local.properties');
if (!fs.existsSync(localProps)) {
  const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    (win ? path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk') : path.join(os.homedir(), 'Android', 'Sdk'));
  if (!fs.existsSync(sdk)) {
    console.error(`Android SDK not found at ${sdk}. Set ANDROID_HOME.`);
    process.exit(1);
  }
  fs.writeFileSync(localProps, `sdk.dir=${sdk.replace(/\\/g, '\\\\')}\n`);
}

const gradleProps = path.join(os.homedir(), '.gradle', 'gradle.properties');
const signed = fs.existsSync(gradleProps) && fs.readFileSync(gradleProps, 'utf8').includes('PADELO_UPLOAD_STORE_FILE');
if (!signed)
  console.warn('\n! No PADELO_UPLOAD_* properties in ~/.gradle/gradle.properties: signing with the debug key.\n');

// full path: some Windows shells don't run programs from the current folder
const gradlew = path.join(android, win ? 'gradlew.bat' : 'gradlew');
run(win ? `"${gradlew}"` : gradlew, [aab ? 'bundleRelease' : 'assembleRelease'], android);

const out = aab ? 'app/build/outputs/bundle/release/app-release.aab' : 'app/build/outputs/apk/release/app-release.apk';
console.log(`\nBuilt ${path.join(android, out)}${signed ? '' : ' (debug-signed)'}`);
