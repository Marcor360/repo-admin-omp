import { useEscapeKey } from '../../hooks/useEscapeKey';
import { Button } from '../ui/Button';

interface DeleteUserDialogProps {
  user: { id?: string; uid?: string; displayName?: string; email?: string } | null;
  loading: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteUserDialog({ user, loading, onConfirm, onCancel }: DeleteUserDialogProps) {
  useEscapeKey(onCancel, user !== null);

  if (!user) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="modal modal--sm"
        role="dialog"
        aria-modal="true"
        aria-label="Eliminar usuario"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2>Eliminar usuario</h2>
        </header>
        <div className="modal-body">
          <p>
            ¿Estás seguro de que deseas eliminar permanentemente a{' '}
            <strong>{user.displayName || user.email || 'este usuario'}</strong>?
          </p>
          <p className="form-error">
            Esta acción eliminará su documento en Firestore y su cuenta de autenticación. No se puede deshacer.
          </p>
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Eliminando...' : 'Sí, eliminar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
