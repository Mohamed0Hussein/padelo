# Releasing Padelo

Maintainer guide: how new versions reach installed apps.

Releases come in two kinds. Most changes only touch JavaScript and ship **over the air**, with no new build. Changes to native code need a **new build**, which you make on your own machine, so neither uses EAS Build quota.

## JavaScript-only change → over-the-air update

```bash
npm run update -- --message "Fix tiebreak serve order"
```

This publishes an [EAS Update](https://docs.expo.dev/eas-update/introduction/) to the `production` channel. Installed apps check on launch, download it in the background and use it from the next start. **Settings › Check for updates** fetches it straight away. EAS Update has its own free-plan limits (monthly users, bandwidth); see [expo.dev/pricing](https://expo.dev/pricing).

## Native change → local build

Native changes are new native libraries, `modules/`, `plugins/`, or plugin and permission settings in `app.json`.

```bash
npm run build:android                # signed APK for phones (arm64 only)
npm run build:android -- --all-abis  # APK for every CPU type (emulators, old 32-bit phones)
npm run build:android -- --aab       # app bundle for the Play Store
```

APKs are built for arm64 only by default. Nearly every phone in use is arm64, and building one CPU type instead of four makes the native build much faster and the APK much smaller. App bundles always include every CPU type, because the Play Store gives each device only the code it needs.

The script runs `expo prebuild` and then Gradle, and prints the output path. Install the APK with `adb install -r <path>` or copy it to the phone.

**Windows:** keep the project in a short folder such as `C:\dev\padelo`. Native libraries compile to paths that contain the project path twice, and the Android build tools fail beyond 260 characters. The script stops early with a message if the path is too long.

`runtimeVersion` uses the **fingerprint** policy: a hash of the native code. An update only reaches builds with the same fingerprint, so a JavaScript update can never land on an app missing the native code it needs. When the native code changes, make a new build first, then publish updates for it.

## Signing key (one-time setup)

Without a key, release builds are signed with the debug key. That's fine for trying things out, but Android only installs an upgrade signed with the same key as the installed app, so set up your own key before giving the app to anyone.

1. Create a key, choosing your own passwords when asked. Store the file somewhere safe outside the repo and back it up: if you lose it, you can't update the app.

   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore padelo-upload.jks -alias padelo -keyalg RSA -keysize 2048 -validity 10000
   ```

   If the app was installed before from an EAS build, download that key instead (`npx eas-cli@latest credentials -p android`). Otherwise uninstall the old app before installing a locally signed one.

2. Add the key to `~/.gradle/gradle.properties` (your user folder, never the repo):

   ```properties
   PADELO_UPLOAD_STORE_FILE=C:/path/to/padelo-upload.jks
   PADELO_UPLOAD_STORE_PASSWORD=...
   PADELO_UPLOAD_KEY_ALIAS=padelo
   PADELO_UPLOAD_KEY_PASSWORD=...
   ```

`plugins/withReleaseSigning.js` reads these values. The build script warns when they're missing.

## Build on GitHub

[.github/workflows/build-android.yml](../.github/workflows/build-android.yml) runs the same `npm run build:android` on GitHub's Linux runners, which have no Windows path limit. It uses GitHub Actions minutes instead of EAS Build quota: free on standard runners for public repositories, a monthly allowance for private ones; see [GitHub's billing docs](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions).

- **Manual build:** Actions › Build Android › Run workflow, choosing APK or AAB. The file is attached to the run as an artifact.
- **Release:** push a version tag and the APK is attached to a GitHub Release:

  ```bash
  git tag v1.0.1
  git push origin v1.0.1
  ```

To sign builds with your key, add four repository secrets under Settings › Secrets and variables › Actions. Without them, builds are debug-signed and the run shows a warning.

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | The `.jks` file, base64-encoded |
| `PADELO_UPLOAD_STORE_PASSWORD` | Keystore password |
| `PADELO_UPLOAD_KEY_ALIAS` | Key alias, e.g. `padelo` |
| `PADELO_UPLOAD_KEY_PASSWORD` | Key password |

With the GitHub CLI (PowerShell), each command asks for the value:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\padelo-upload.jks")) | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set PADELO_UPLOAD_STORE_PASSWORD
gh secret set PADELO_UPLOAD_KEY_ALIAS
gh secret set PADELO_UPLOAD_KEY_PASSWORD
```

Use the same key everywhere (your machine and GitHub). Android only installs upgrades signed with the key the installed app was signed with.

`.gitattributes` keeps line endings LF on every machine. The update fingerprint hashes native config files, so a Windows checkout with CRLF would otherwise produce a different fingerprint from the GitHub build, and updates published from one machine would not reach apps built on the other.

## EAS Build (optional)

EAS Build still works and uses quota: `npx eas-cli@latest build --profile production --platform android`. Its `preview` and `production` profiles set the matching update channel.
