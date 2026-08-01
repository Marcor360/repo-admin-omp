import { useEffect, useState } from 'react';
import { VALIDATION_MESSAGES } from '../../constants/messages';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { AppUser } from '../../types/user.types';
import { getUserDisplayName } from '../../utils/userDisplay';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ChangePasswordModalProps {
  user: AppUser | null;
  isOpen: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (userId: string, password: string) => Promise<void>;
}

function strengthLevel(pw: string): { level: number; label: string } {
  if (pw.length === 0) return { level: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Muy débil' };
  if (score === 2) return { level: 2, label: 'Débil' };
  if (score === 3) return { level: 3, label: 'Aceptable' };
  if (score === 4) return { level: 4, label: 'Fuerte' };
  return { level: 5, label: 'Muy fuerte' };
}

export function ChangePasswordModal({
  user,
  isOpen,
  saving,
  error,
  onClose,
  onSave,
}: ChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirm('');
      setShowPassword(false);
      setValidationError('');
    }
  }, [isOpen, user]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen || !user) return null;

  const strength = strengthLevel(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError('');

    if (password.length < 8) {
      setValidationError(VALIDATION_MESSAGES.passwordLength);
      return;
    }
    if (password !== confirm) {
      setValidationError(VALIDATION_MESSAGES.passwordsMismatch);
      return;
    }

    await onSave(user!.uid ?? user!.id, password);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal modal--md"
        role="dialog"
        aria-modal="true"
        aria-label="Cambiar contraseña"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-header modal-header--accent">
          <div>
            <h2>🔑 Cambiar contraseña</h2>
            <p className="modal-header-subtitle">
              {getUserDisplayName(user)} <span className="domain-text">— {user.email}</span>
            </p>
          </div>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Cerrar modal" className="modal-header-close">
            ×
          </Button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body form-stack">
            <div className="password-field-wrap">
              <Input
                id="new-password"
                label="Nueva contraseña *"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? 'Ocultar' : 'Mostrar'}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {password.length > 0 && (
              <div className="password-strength">
                <div className="password-strength-bars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`password-strength-bar${i <= strength.level ? ` password-strength-bar--${strength.level}` : ''}`}
                    />
                  ))}
                </div>
                <p className={`password-strength-label password-strength-label--${strength.level}`}>
                  {strength.label}
                  {strength.level < 3 && (
                    <span className="text-muted-sm"> — Usa mayúsculas, números y símbolos para fortalecerla.</span>
                  )}
                </p>
              </div>
            )}

            <Input
              id="confirm-password"
              label="Confirmar contraseña *"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
              required
            />

            {confirm.length > 0 && (
              <p className={`password-match${password === confirm ? ' password-match--ok' : ' password-match--fail'}`}>
                {password === confirm ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
              </p>
            )}

            {(validationError || error) && <p className="form-error">{validationError || error}</p>}

            <div className="info-banner">
              ℹ️ El usuario deberá usar esta nueva contraseña la próxima vez que inicie sesión.
            </div>
          </div>

          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving || password.length < 8 || password !== confirm}
            >
              {saving ? 'Guardando...' : '🔑 Cambiar contraseña'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
