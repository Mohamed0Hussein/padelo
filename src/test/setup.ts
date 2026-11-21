/**
 * Jest setup shared by every test file: fakes for the router, the DB and device APIs.
 * A test file can still override any of these with its own jest.mock (store.test.ts does for @/db).
 */
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  const { router, params } = jest.requireActual('./router');
  return {
    useRouter: () => router,
    useLocalSearchParams: () => params.current,
    useFocusEffect: (cb: () => void | (() => void)) => useEffect(cb, [cb]),
  };
});
jest.mock('@/db', () => ({
  openDb: async () => {},
  loadAll: async () => [],
  saveDoc: () => {},
  deleteDoc: () => {},
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('expo-keep-awake', () => ({ activateKeepAwakeAsync: jest.fn(), deactivateKeepAwake: jest.fn() }));
jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(),
  OrientationLock: { LANDSCAPE: 'landscape', PORTRAIT_UP: 'portrait' },
}));
jest.mock('expo-updates', () => ({
  isEnabled: true,
  updateId: null,
  checkForUpdateAsync: jest.fn(async () => ({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(async () => ({ isNew: true })),
  reloadAsync: jest.fn(async () => {}),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => {
  const { files } = jest.requireActual('./router');
  class File {
    exists = false;
    uri: string;
    constructor(_dir: string, name: string) {
      this.uri = `file:///cache/${name}`;
    }
    create() {}
    delete() {}
    write(body: string) {
      files.set(this.uri, body);
    }
  }
  return { File, Paths: { cache: 'cache' } };
});
jest.mock('react-native-view-shot', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  return forwardRef(({ children }: { children: unknown }, ref: unknown) => {
    useImperativeHandle(ref, () => ({ capture: async () => 'file:///shot.png' }));
    return children;
  });
});
jest.mock('react-native-qrcode-svg', () => {
  const { Text } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return ({ value }: { value: string }) => createElement(Text, { testID: 'qr' }, value);
});
