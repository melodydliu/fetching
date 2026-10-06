import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { config } from '@/config';
import { createMockServices } from './mock';
import type { Services } from './types';

/**
 * The single switch between implementations: `EXPO_PUBLIC_USE_MOCKS=false` selects Supabase.
 * No screen code changes between the two.
 */
export function createServices(): Services {
  if (config.useMocks) return createMockServices();
  // Loaded only when needed, so mock mode and tests never touch the native storage module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createSupabaseServices } = require('./supabase') as typeof import('./supabase');
  return createSupabaseServices();
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
