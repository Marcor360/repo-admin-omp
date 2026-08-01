import type { ReactNode } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { Button } from './Button';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right';
}

export function Drawer({ isOpen, onClose, title, children, side = 'right' }: DrawerProps) {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`drawer drawer--${side}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <h2>{title}</h2>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Cerrar panel">
            ×
          </Button>
        </header>
        <div className="drawer-body">{children}</div>
      </section>
    </div>
  );
}
