import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ServicesProvider } from '@/services';
import { createMockServices, MockDb } from '@/services/mock';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Renders UI with the mock services (no latency in tests), a fresh query cache and safe-area. */
export async function renderWithApp(ui: ReactElement, db: MockDb = new MockDb()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const services = createMockServices(db);
  const result = await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={queryClient}>
        <ServicesProvider services={services}>{ui}</ServicesProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return { ...result, db, services, queryClient };
}
