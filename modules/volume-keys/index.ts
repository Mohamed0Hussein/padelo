import { requireOptionalNativeModule } from 'expo';

type Dir = 'up' | 'down';
const native = requireOptionalNativeModule('VolumeKeys');

/** Android only. Returns an unsubscribe. While active, system volume does not change. */
export function startVolumeKeys(onKey: (d: Dir) => void): () => void {
  if (!native) return () => {};
  native.setEnabled(true);
  const sub = native.addListener('onVolumeKey', (e: { direction: Dir }) => onKey(e.direction));
  return () => {
    sub.remove();
    native.setEnabled(false);
  };
}
