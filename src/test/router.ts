/** Shared fake state behind the mocks in setup.ts. */
export const router = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: () => true,
};
export const params: { current: Record<string, string> } = { current: {} };
/** Files written through the expo-file-system mock, by uri. */
export const files = new Map<string, string>();
