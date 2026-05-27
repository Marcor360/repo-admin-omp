interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Cargando...' }: LoadingStateProps) {
  return (
    <div className="state state-loading">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
