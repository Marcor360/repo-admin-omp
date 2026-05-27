import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  value?: string | number;
  description?: string;
  children?: ReactNode;
}

export function Card({ title, value, description, children }: CardProps) {
  return (
    <section className="card">
      {title ? <p className="card-title">{title}</p> : null}
      {value !== undefined ? <strong className="card-value">{value}</strong> : null}
      {description ? <p className="card-description">{description}</p> : null}
      {children}
    </section>
  );
}
