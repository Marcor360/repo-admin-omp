import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <label className="field" htmlFor={id}>
      {label ? <span className="field-label">{label}</span> : null}
      <input id={id} className={`input ${className}`} {...props} />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
