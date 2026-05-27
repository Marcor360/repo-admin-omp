import { useEffect, useMemo, useState } from 'react';
import type { Congregation, CongregationLeadership } from '../../types/congregation.types';
import type { AppUser } from '../../types/user.types';
import { getUserDisplayName } from '../../utils/userDisplay';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';

interface LeadershipPanelProps {
  congregation: Congregation;
  activeUsers: AppUser[];
  loading?: boolean;
  onSave: (leadership: CongregationLeadership) => Promise<void> | void;
}

export function LeadershipPanel({ congregation, activeUsers, loading = false, onSave }: LeadershipPanelProps) {
  const [secretaryUserId, setSecretaryUserId] = useState('');
  const [coordinatorUserId, setCoordinatorUserId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSecretaryUserId(congregation.leadership?.secretaryUserId ?? '');
    setCoordinatorUserId(congregation.leadership?.coordinatorUserId ?? '');
    setMessage('');
  }, [congregation]);

  const userOptions = useMemo(
    () => [
      { label: 'Sin asignar', value: '' },
      ...activeUsers.map((user) => ({ label: getUserDisplayName(user), value: user.uid || user.id })),
    ],
    [activeUsers],
  );

  function validateSelectedUser(uid: string): boolean {
    if (!uid) return true;
    const user = activeUsers.find((item) => (item.uid || item.id) === uid);
    return Boolean(user && user.isActive === true && user.congregationId === congregation.id);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!validateSelectedUser(secretaryUserId) || !validateSelectedUser(coordinatorUserId)) {
      setMessage('El secretario y el coordinador deben ser usuarios activos de esta congregación.');
      return;
    }

    await onSave({
      secretaryUserId: secretaryUserId || null,
      coordinatorUserId: coordinatorUserId || null,
    });
    setMessage('Liderazgo actualizado correctamente.');
  }

  return (
    <Card>
      <div className="section-header compact">
        <div>
          <h2>Liderazgo</h2>
          <p>Secretario y coordinador se guardan como UID. No se modifica el rol del usuario.</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <Select
          id="secretary"
          label="Secretario"
          value={secretaryUserId}
          onChange={(event) => setSecretaryUserId(event.target.value)}
          options={userOptions}
        />
        <Select
          id="coordinator"
          label="Coordinador"
          value={coordinatorUserId}
          onChange={(event) => setCoordinatorUserId(event.target.value)}
          options={userOptions}
        />
        {message ? <p className="form-note full-span">{message}</p> : null}
        <div className="full-span actions-right">
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar liderazgo'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
