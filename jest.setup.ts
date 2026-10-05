// Mock services use real timers with ~200–500ms latency in the app; tests run with none.
process.env.EXPO_PUBLIC_MOCK_LATENCY = '0';
