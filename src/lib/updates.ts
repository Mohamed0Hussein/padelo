import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

/**
 * Over-the-air updates (EAS Update). The app also checks on every launch by default
 * (updates.checkAutomatically = ON_LOAD) and applies a downloaded update on the next start.
 */
export type UpdateCheck = 'disabled' | 'none' | 'ready';

/** Checks for a newer update and downloads it. 'ready' = restart to apply. */
export async function checkForUpdate(): Promise<UpdateCheck> {
  // off in development builds (code comes from the dev server) and in Expo Go
  if (!Updates.isEnabled) return 'disabled';
  const { isAvailable } = await Updates.checkForUpdateAsync();
  if (!isAvailable) return 'none';
  await Updates.fetchUpdateAsync();
  return 'ready';
}

export const restartToUpdate = () => Updates.reloadAsync();

/** e.g. "Version 1.0.0 · update 3f2a9c1e" or "Version 1.0.0 · built-in" */
export function versionLabel(): string {
  const v = Constants.expoConfig?.version;
  const which = Updates.updateId ? `update ${Updates.updateId.slice(0, 8)}` : 'built-in';
  return v ? `Version ${v} · ${which}` : which;
}
