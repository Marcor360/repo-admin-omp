import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  icon?: ReactNode;
}

export function StatCard({ label, value, hint, tone = 'neutral', icon }: StatCardProps) {
  return (
    <section className={`stat-card stat-card--${tone}`}>
      <div className="stat-card-head">
        {icon ? (
          <span className="stat-card-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <p className="stat-card-label">{label}</p>
      </div>
      <strong className="stat-card-value">{value}</strong>
      {hint ? <p className="stat-card-hint">{hint}</p> : null}
    </section>
  );
}
