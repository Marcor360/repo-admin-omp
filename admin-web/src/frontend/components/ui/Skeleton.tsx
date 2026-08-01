interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'block' | 'circle';
  className?: string;
}

export function Skeleton({ width, height, variant = 'text', className = '' }: SkeletonProps) {
  return (
    <span
      className={`skeleton skeleton--${variant} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
