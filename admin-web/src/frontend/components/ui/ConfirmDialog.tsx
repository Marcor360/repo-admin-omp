import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onCancel}>
      <div className="modal-body">
        <p>{description}</p>
      </div>
      <footer className="modal-footer">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} type="button" onClick={onConfirm} disabled={loading}>
          {loading ? 'Procesando...' : confirmLabel}
        </Button>
      </footer>
    </Modal>
  );
}
