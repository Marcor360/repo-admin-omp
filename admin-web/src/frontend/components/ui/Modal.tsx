import type { ReactNode } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { Button } from './Button';

interface ModalProps {
  title: string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function Modal({ title, children, isOpen, onClose }: ModalProps) {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Cerrar modal">
            ×
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
}
