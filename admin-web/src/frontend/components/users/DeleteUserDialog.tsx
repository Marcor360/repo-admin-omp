import { Button } from '../ui/Button';

interface DeleteUserDialogProps {
  user: { id?: string; uid?: string; displayName?: string; email?: string } | null;
  loading: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteUserDialog({ user, loading, onConfirm, onCancel }: DeleteUserDialogProps) {
  if (!user) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: '400px' }}>
        <header className="modal-header">
          <h2 style={{ margin: 0 }}>Eliminar usuario</h2>
        </header>
        <div className="modal-body">
          <p>
            ¿Estás seguro de que deseas eliminar permanentemente a{' '}
            <strong>{user.displayName || user.email || 'este usuario'}</strong>?
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--danger)', marginTop: '8px' }}>
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
