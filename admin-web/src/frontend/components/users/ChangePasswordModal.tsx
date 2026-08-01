import { useEffect, useState } from 'react';
import { VALIDATION_MESSAGES } from '../../constants/messages';
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

function strengthLevel(pw: string): { level: number; label: string; color: string } {
  if (pw.length === 0) return { level: 0, label: '', color: 'var(--border)' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Muy débil', color: '#ef4444' };
  if (score === 2) return { level: 2, label: 'Débil', color: '#f97316' };
  if (score === 3) return { level: 3, label: 'Aceptable', color: '#eab308' };
  if (score === 4) return { level: 4, label: 'Fuerte', color: '#22c55e' };
  return { level: 5, label: 'Muy fuerte', color: '#16a34a' };
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
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Cambiar contraseña"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: 'min(480px, 100%)' }}
      >
        {/* Header */}
        <header className="modal-header" style={{
          background: 'linear-gradient(135deg, #1e3a5f, #1f6feb)',
          color: '#fff',
          borderRadius: '24px 24px 0 0',
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff' }}>🔑 Cambiar contraseña</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.85 }}>
              {getUserDisplayName(user)}{' '}
              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>— {user.email}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{ color: 'rgba(255,255,255,0.8)', fontSize: '24px' }}
          >
            ×
          </Button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
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
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  bottom: '11px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: 'var(--muted)',
                  padding: 0,
                  lineHeight: 1,
                }}
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Strength meter */}
            {password.length > 0 && (
              <div style={{ display: 'grid', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '4px', height: '6px' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        borderRadius: '4px',
                        background: i <= strength.level ? strength.color : 'var(--border)',
                        transition: 'background 0.25s',
                      }}
                    />
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: strength.color, fontWeight: 700 }}>
                  {strength.label}
                  {strength.level < 3 && (
                    <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                      {' '}— Usa mayúsculas, números y símbolos para fortalecerla.
                    </span>
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

            {/* Match indicator */}
            {confirm.length > 0 && (
              <p style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 700,
                color: password === confirm ? 'var(--success)' : 'var(--danger)',
              }}>
                {password === confirm ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
              </p>
            )}

            {(validationError || error) && (
              <p className="form-error" style={{ margin: 0 }}>
                {validationError || error}
              </p>
            )}

            <div style={{
              background: 'var(--info-bg)',
              color: 'var(--info)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              ℹ️ El usuario deberá usar esta nueva contraseña la próxima vez que inicie sesión.
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '18px 20px' }}>
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
