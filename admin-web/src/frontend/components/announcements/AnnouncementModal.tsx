import type { SystemAnnouncement } from '../../types/announcement.types';
import { Button } from '../ui/Button';

interface AnnouncementModalProps {
  announcement: SystemAnnouncement | null;
  onClose: (id: string) => void;
}

export function AnnouncementModal({ announcement, onClose }: AnnouncementModalProps) {
  if (!announcement) return null;

  const styleConfig = {
    info: { icon: 'ℹ️', bg: '#eff8ff', color: '#1d4ed8', border: '#bfdbfe' },
    success: { icon: '✅', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    warning: { icon: '⚠️', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    maintenance: { icon: '🔧', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  };

  const style = styleConfig[announcement.type] || styleConfig.info;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => onClose(announcement.id)}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={announcement.title}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: 'min(450px, 100%)', borderTop: `4px solid ${style.color}` }}
      >
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderRadius: '12px',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              flexShrink: 0
            }}>
              {style.icon}
            </div>
            
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--text)' }}>
                {announcement.title}
              </h2>
              <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {announcement.message}
              </p>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" onClick={() => onClose(announcement.id)}>
              Entendido
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
