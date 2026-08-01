import { useEffect, useState } from 'react';
import { VALIDATION_MESSAGES } from '../../constants/messages';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { AppUser, UpdateUserPayload } from '../../types/user.types';
import { getUserDisplayName } from '../../utils/userDisplay';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface EditUserModalProps {
  user: AppUser | null;
  congregationId: string;
  isOpen: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (userId: string, payload: UpdateUserPayload) => Promise<void>;
}

// isSystemProtected removed since superadmin can edit everything

export function EditUserModal({
  user,
  congregationId: _congregationId,
  isOpen,
  saving,
  error,
  onClose,
  onSave,
}: EditUserModalProps) {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'masculino' | 'femenino' | ''>('');
  const [role, setRole] = useState('user');
  const [isActive, setIsActive] = useState(true);
  const [validationError, setValidationError] = useState('');

  // Sync form when user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setMiddleName(user.middleName ?? '');
      setLastName(user.lastName ?? '');
      setSecondLastName(user.secondLastName ?? '');
      setPhone(user.phone ?? '');
      setGender((user.gender as 'masculino' | 'femenino' | '') ?? '');
      setRole(user.role ?? 'user');
      setIsActive(user.isActive ?? true);
      setValidationError('');
    }
  }, [user]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen || !user) return null;


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError('');

    if (!user) return;

    if (!firstName.trim()) {
      setValidationError(VALIDATION_MESSAGES.firstNameRequired);
      return;
    }
    if (!lastName.trim()) {
      setValidationError(VALIDATION_MESSAGES.lastNameRequired);
      return;
    }

    const payload: UpdateUserPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      isActive,
    };
    if (middleName.trim()) payload.middleName = middleName.trim();
    if (secondLastName.trim()) payload.secondLastName = secondLastName.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (gender) payload.gender = gender;

    await onSave(user.uid ?? user.id, payload);
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Editar usuario"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="modal-header">
          <div>
            <h2>✏️ Editar usuario</h2>
            <p className="modal-header-subtitle">
              {getUserDisplayName(user)} &mdash; <span className="domain-text">{user.email}</span>
            </p>
          </div>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Cerrar modal">
            ×
          </Button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            <div className="form-grid">
              <Input
                id="edit-firstName"
                label="Nombre *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nombre"
                required
              />
              <Input
                id="edit-middleName"
                label="Segundo nombre"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Segundo nombre (opcional)"
              />
              <Input
                id="edit-lastName"
                label="Apellido paterno *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Apellido paterno"
                required
              />
              <Input
                id="edit-secondLastName"
                label="Apellido materno"
                value={secondLastName}
                onChange={(e) => setSecondLastName(e.target.value)}
                placeholder="Apellido materno (opcional)"
              />
              <Input
                id="edit-phone"
                label="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 000 000 0000"
                type="tel"
              />
              <Select
                id="edit-gender"
                label="Género"
                value={gender}
                onChange={(e) => setGender(e.target.value as 'masculino' | 'femenino' | '')}
                options={[
                  { label: 'Sin especificar', value: '' },
                  { label: 'Masculino', value: 'masculino' },
                  { label: 'Femenino', value: 'femenino' },
                ]}
              />
              <Select
                id="edit-role"
                label="Rol *"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={[
                  { label: 'Administrador', value: 'admin' },
                  { label: 'Supervisor', value: 'supervisor' },
                  { label: 'Usuario', value: 'user' },
                ]}
              />
              <Select
                id="edit-isActive"
                label="Estado *"
                value={isActive ? 'true' : 'false'}
                onChange={(e) => setIsActive(e.target.value === 'true')}
                options={[
                  { label: 'Activo', value: 'true' },
                  { label: 'Inactivo', value: 'false' },
                ]}
              />
            </div>

            {(validationError || error) && <p className="form-error">{validationError || error}</p>}
          </div>

          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
