import { EmptyState } from './EmptyState';

export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <EmptyState
      illustration="error-load-failed"
      title="That didn't fetch"
      body={message ?? 'Something went sideways on our end. Give it another go.'}
      actionLabel="Try again"
      onAction={onRetry}
    />
  );
}
