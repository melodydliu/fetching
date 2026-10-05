import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { config } from '@/config';
import { createMockServices } from './mock';
import type { Services } from './types';

/**
 * The single switch between implementations. Add `createSupabaseServices()` here
 * and flip `EXPO_PUBLIC_USE_MOCKS=false`; no screen code changes.
 */
export function createServices(): Services {
  if (config.useMocks) return createMockServices();
  throw new Error('Real services are not implemented yet. Set EXPO_PUBLIC_USE_MOCKS=true.');
}

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({
  children,
  services,
}: {
  children: ReactNode;
  services?: Services;
}) {
  const value = useMemo(() => services ?? createServices(), [services]);
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices must be used inside <ServicesProvider>');
  return services;
}

export * from './types';
