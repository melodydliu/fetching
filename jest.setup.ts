// Mock services use real timers with ~200–500ms latency in the app; tests run with none.
process.env.EXPO_PUBLIC_MOCK_LATENCY = '0';

// Reanimated / worklets need their native runtime; component tests use the JS mocks instead.
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  __esModule: true,
  useReducedMotion: () => true,
}));
