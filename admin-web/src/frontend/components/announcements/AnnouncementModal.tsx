import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { SystemAnnouncement } from '../../types/announcement.types';
import { Button } from '../ui/Button';

interface AnnouncementModalProps {
  announcement: SystemAnnouncement | null;
  onClose: (id: string) => void;
}

const TYPE_ICONS: Record<SystemAnnouncement['type'], string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  maintenance: '🔧',
};

export function AnnouncementModal({ announcement, onClose }: AnnouncementModalProps) {
  useEscapeKey(() => announcement && onClose(announcement.id), announcement !== null);

  if (!announcement) return null;

  const type = TYPE_ICONS[announcement.type] ? announcement.type : 'info';

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => onClose(announcement.id)}>
      <section
        className={`modal modal--sm announcement-modal announcement-modal--${type}`}
        role="dialog"
        aria-modal="true"
        aria-label={announcement.title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="announcement-modal-body">
          <div className="announcement-modal-head">
            <div className="announcement-modal-icon" aria-hidden="true">
              {TYPE_ICONS[type]}
            </div>
            <div>
              <h2>{announcement.title}</h2>
              <p className="announcement-modal-message">{announcement.message}</p>
            </div>
          </div>

          <div className="announcement-modal-actions">
            <Button variant="primary" onClick={() => onClose(announcement.id)}>
              Entendido
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
