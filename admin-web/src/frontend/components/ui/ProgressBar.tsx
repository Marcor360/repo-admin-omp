interface ProgressBarProps {
  value: number;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  label?: string;
}

export function ProgressBar({ value, tone = 'primary', label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="progress-bar-wrap">
      {label ? <span className="progress-bar-label">{label}</span> : null}
      <div
        className="progress-bar-track"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={`progress-bar-fill progress-bar-fill--${tone}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
