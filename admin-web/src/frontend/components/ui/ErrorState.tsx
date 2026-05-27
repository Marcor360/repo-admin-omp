import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Error', message, onRetry }: ErrorStateProps) {
  return (
    <div className="state state-error">
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry ? (
        <Button type="button" variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
