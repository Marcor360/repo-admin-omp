import { useEffect, useState } from 'react';
import { VALIDATION_MESSAGES } from '../../constants/messages';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { AnnouncementTarget, AnnouncementType, CreateAnnouncementPayload, SystemAnnouncement, UpdateAnnouncementPayload } from '../../types/announcement.types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface AnnouncementFormModalProps {
  announcement: SystemAnnouncement | null;
  isOpen: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (payload: CreateAnnouncementPayload | UpdateAnnouncementPayload, id?: string) => Promise<void>;
}

function toLocalISOString(timestamp: any): string {
  if (!timestamp) return '';
  const d = new Date(timestamp._seconds ? timestamp._seconds * 1000 : timestamp);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function AnnouncementFormModal({
  announcement,
  isOpen,
  saving,
  error,
  onClose,
  onSave,
}: AnnouncementFormModalProps) {
  const isEditing = !!announcement;

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AnnouncementType>('info');
  const [target, setTarget] = useState<AnnouncementTarget>('all');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [showOnce, setShowOnce] = useState(true);
  const [active, setActive] = useState(true);
  const [priority, setPriority] = useState('0');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (announcement) {
        setTitle(announcement.title);
        setMessage(announcement.message);
        setType(announcement.type);
        setTarget(announcement.target);
        setStartsAt(toLocalISOString(announcement.startsAt));
        setEndsAt(toLocalISOString(announcement.endsAt));
        setShowOnce(announcement.showOnce);
        setActive(announcement.active);
        setPriority(String(announcement.priority));
      } else {
        setTitle('');
        setMessage('');
        setType('info');
        setTarget('all');
        setStartsAt(toLocalISOString(new Date()));
        setEndsAt('');
        setShowOnce(true);
        setActive(true);
        setPriority('0');
      }
      setValidationError('');
    }
  }, [isOpen, announcement]);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError('');

    if (!title.trim() || !message.trim() || !startsAt) {
      setValidationError(VALIDATION_MESSAGES.announcementRequired);
      return;
    }

    if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setValidationError(VALIDATION_MESSAGES.announcementEndDate);
      return;
    }

    const parsedPriority = parseInt(priority, 10) || 0;
    if (parsedPriority < 0 || parsedPriority > 10) {
      setValidationError(VALIDATION_MESSAGES.announcementPriority);
      return;
    }

    const payload: CreateAnnouncementPayload = {
      title: title.trim(),
      message: message.trim(),
      type,
      target,
      active,
      showOnce,
      priority: parsedPriority,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
    };

    await onSave(payload, announcement?.id);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal modal--md"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Editar aviso' : 'Nuevo aviso'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{isEditing ? '✏️ Editar aviso' : '📢 Nuevo aviso'}</h2>
          <Button variant="ghost" type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </Button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body form-stack">
            <Input
              id="ann-title"
              label="Título *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <label className="field">
              <span className="field-label">Mensaje *</span>
              <textarea
                className="input textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </label>

            <div className="form-grid">
              <Select
                id="ann-type"
                label="Tipo *"
                value={type}
                onChange={(e) => setType(e.target.value as AnnouncementType)}
                options={[
                  { label: 'Información', value: 'info' },
                  { label: 'Éxito', value: 'success' },
                  { label: 'Alerta', value: 'warning' },
                  { label: 'Mantenimiento', value: 'maintenance' },
                ]}
              />
              <Select
                id="ann-target"
                label="Destino *"
                value={target}
                onChange={(e) => setTarget(e.target.value as AnnouncementTarget)}
                options={[
                  { label: 'App y Web', value: 'all' },
                  { label: 'Solo App Móvil', value: 'app' },
                  { label: 'Solo Web', value: 'web' },
                ]}
              />
            </div>

            <div className="form-grid">
              <Input
                id="ann-starts"
                label="Fecha de inicio *"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
              <Input
                id="ann-ends"
                label="Fecha de fin (opcional)"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>

            <Input
              id="ann-priority"
              label="Prioridad (0 a 10, 10=máxima)"
              type="number"
              min={0}
              max={10}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showOnce}
                  onChange={(e) => setShowOnce(e.target.checked)}
                />
                <span>Mostrar solo una vez por usuario</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span>Aviso activo (visible si en fechas)</span>
              </label>
            </div>

            {(validationError || error) && <p className="form-error">{validationError || error}</p>}
          </div>

          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar aviso'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
