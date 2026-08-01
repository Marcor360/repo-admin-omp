import { useEffect, useState } from 'react';
import { AnnouncementFormModal } from '../components/announcements/AnnouncementFormModal';
import { AnnouncementList } from '../components/announcements/AnnouncementList';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { ERROR_MESSAGES } from '../constants/messages';
import { createSystemAnnouncement, deleteSystemAnnouncement, getSystemAnnouncements, updateSystemAnnouncement } from '../services/announcements.service';
import type { CreateAnnouncementPayload, SystemAnnouncement, UpdateAnnouncementPayload } from '../types/announcement.types';

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadAnnouncements() {
    setLoading(true);
    setError('');
    try {
      const data = await getSystemAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.loadAnnouncements);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  function handleCreateNew() {
    setEditingAnnouncement(null);
    setSaveError('');
    setModalOpen(true);
  }

  function handleEdit(announcement: SystemAnnouncement) {
    setEditingAnnouncement(announcement);
    setSaveError('');
    setModalOpen(true);
  }

  async function handleSave(payload: CreateAnnouncementPayload | UpdateAnnouncementPayload, id?: string) {
    setSaving(true);
    setSaveError('');
    try {
      if (id) {
        await updateSystemAnnouncement(id, payload as UpdateAnnouncementPayload);
        setNotice('Aviso actualizado correctamente.');
      } else {
        await createSystemAnnouncement(payload as CreateAnnouncementPayload);
        setNotice('Aviso creado correctamente.');
      }
      setModalOpen(false);
      setTimeout(() => setNotice(''), 4000);
      void loadAnnouncements();
    } catch (err: any) {
      setSaveError(err.message || ERROR_MESSAGES.saveAnnouncement);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSystemAnnouncement(id);
      setNotice('Aviso eliminado correctamente.');
      setTimeout(() => setNotice(''), 4000);
      void loadAnnouncements();
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.deleteAnnouncement);
    }
  }

  if (loading) return <LoadingState label="Cargando avisos del sistema..." />;
  if (error) return <ErrorState message={error} onRetry={loadAnnouncements} />;

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Avisos del Sistema</h1>
          <p>Gestiona los comunicados globales para la app móvil y el portal web.</p>
        </div>
        <Button variant="primary" onClick={handleCreateNew}>
          + Nuevo aviso
        </Button>
      </div>

      {notice && <div className="notice success">{notice}</div>}

      <Card>
        <AnnouncementList
          announcements={announcements}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Card>

      <AnnouncementFormModal
        announcement={editingAnnouncement}
        isOpen={modalOpen}
        saving={saving}
        error={saveError}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </section>
  );
}
