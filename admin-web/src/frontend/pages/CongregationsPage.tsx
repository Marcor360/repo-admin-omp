import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { CongregationFormModal } from '../components/congregations/CongregationFormModal';
import { CongregationBillingModal } from '../components/congregations/CongregationBillingModal';
import { CongregationTable } from '../components/congregations/CongregationTable';
import { DeleteCongregationDialog } from '../components/congregations/DeleteCongregationDialog';
import { DeactivateReasonDialog } from '../components/congregations/DeactivateReasonDialog';
import type { DeactivationReason } from '../components/congregations/DeactivateReasonDialog';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { ERROR_MESSAGES } from '../constants/messages';
import {
  createCongregation,
  deleteCongregation,
  exportCongregationExcel,
  getCongregations,
  setCongregationActiveStatus,
  updateCongregation,
  updateCongregationBilling,
} from '../services/congregations.service';
import type { CreateCongregationResult } from '../services/congregations.service';
import type { Congregation, CongregationFormInput, CongregationWithStats } from '../types/congregation.types';

export function CongregationsPage() {
  const { user } = useAuth();
  const [congregations, setCongregations] = useState<CongregationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCongregation, setEditingCongregation] = useState<Congregation | null>(null);
  const [firstAdminCredentials, setFirstAdminCredentials] = useState<CreateCongregationResult['firstAdmin'] | null>(null);

  // Estados para desactivación con motivo
  const [deactivateTarget, setDeactivateTarget] = useState<CongregationWithStats | null>(null);
  // Estado para activación (ConfirmDialog simple)
  const [activateTarget, setActivateTarget] = useState<CongregationWithStats | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CongregationWithStats | null>(null);
  const [billingTarget, setBillingTarget] = useState<CongregationWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const sortedCongregations = useMemo(
    () => [...congregations].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es')),
    [congregations],
  );

  async function loadCongregations() {
    setLoading(true);
    setError('');

    try {
      const baseCongregations = await getCongregations();
      setCongregations(baseCongregations as CongregationWithStats[]);
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.loadCongregations);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCongregations();
  }, []);

  function openCreateModal() {
    setEditingCongregation(null);
    setIsFormOpen(true);
  }

  function openEditModal(congregation: Congregation) {
    setEditingCongregation(congregation);
    setIsFormOpen(true);
  }

  async function handleSubmit(input: CongregationFormInput) {
    if (!user) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      if (editingCongregation) {
        await updateCongregation(editingCongregation.id, input);
        setNotice('Congregación actualizada correctamente.');
      } else {
        const result = await createCongregation(input);
        setFirstAdminCredentials(result.firstAdmin);
        setNotice('Congregación creada. Guarda las credenciales del administrador inicial.');
      }

      setIsFormOpen(false);
      await loadCongregations();
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.saveCongregation);
    } finally {
      setSaving(false);
    }
  }

  // Llamado cuando se presiona "Activar" en la tabla
  function handleToggleStatusClick(congregation: CongregationWithStats) {
    if (congregation.isActive) {
      // Desactivar → abre el dialog de motivo
      setDeactivateTarget(congregation);
    } else {
      // Activar → ConfirmDialog simple
      setActivateTarget(congregation);
    }
  }

  // Confirmación de DESACTIVACIÓN con motivo
  async function handleDeactivate(reason: DeactivationReason) {
    if (!deactivateTarget || !user) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await setCongregationActiveStatus(deactivateTarget.id, false, reason);
      setNotice(`Congregación "${deactivateTarget.name}" desactivada. Motivo: ${reason}.`);
      setDeactivateTarget(null);
      await loadCongregations();
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.deactivateCongregation);
    } finally {
      setSaving(false);
    }
  }

  // Confirmación de ACTIVACIÓN
  async function handleActivate() {
    if (!activateTarget || !user) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await setCongregationActiveStatus(activateTarget.id, true);
      setNotice(`Congregación "${activateTarget.name}" activada correctamente.`);
      setActivateTarget(null);
      await loadCongregations();
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.activateCongregation);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(congregation: CongregationWithStats) {
    setExporting(true);
    setError('');
    try {
      await exportCongregationExcel(congregation.id, congregation.name);
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.exportData);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(confirmName: string) {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await exportCongregationExcel(deleteTarget.id, deleteTarget.name);
    } catch (_) {
      // Continuar con la eliminación aunque falle la exportación
    }
    try {
      const result = await deleteCongregation(deleteTarget.id, confirmName);
      setDeleteTarget(null);
      setNotice(`Congregación "${result.congregationName}" eliminada. Se descargó el respaldo Excel con todos los datos. Usuarios eliminados: ${result.summary.users ?? 0}.`);
      await loadCongregations();
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.deleteCongregation);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveBilling(congregationId: string, payload: any) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updateCongregationBilling(congregationId, payload);
      setNotice('Configuración de facturación actualizada.');
      setBillingTarget(null);
      await loadCongregations();
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.updateBilling);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando congregaciones..." />;

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Congregaciones</h1>
          <p>Crea, visualiza y administra congregaciones.</p>
        </div>
        <Button type="button" onClick={openCreateModal}>
          Crear congregación
        </Button>
      </div>

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <ErrorState message={error} onRetry={loadCongregations} /> : null}

      {firstAdminCredentials ? (
        <div className="credentials-modal-overlay" onClick={() => setFirstAdminCredentials(null)}>
          <div className="credentials-modal" onClick={(e) => e.stopPropagation()}>
            <div className="credentials-modal-header">
              <h2>🎉 Congregación Creada</h2>
              <p>Guarda estas credenciales del primer administrador. <strong>Solo se muestran una vez.</strong></p>
            </div>
            <div className="credentials-modal-body">
              <div className="credential-field">
                <label>Correo electrónico</label>
                <div className="credential-value">
                  <span>{firstAdminCredentials.email}</span>
                  <button type="button" onClick={() => navigator.clipboard.writeText(firstAdminCredentials.email)}>Copiar</button>
                </div>
              </div>
              <div className="credential-field">
                <label>Contraseña temporal</label>
                <div className="credential-value">
                  <span className="password-display">{firstAdminCredentials.password}</span>
                  <button type="button" onClick={() => navigator.clipboard.writeText(firstAdminCredentials.password)}>Copiar</button>
                </div>
              </div>
              <div className="credential-warning">
                ⚠️ El usuario deberá cambiar su contraseña al iniciar sesión por primera vez.
              </div>
            </div>
            <div className="credentials-modal-footer">
              <button type="button" className="btn-primary" onClick={() => setFirstAdminCredentials(null)}>Entendido, ya guardé las credenciales</button>
            </div>
          </div>
        </div>
      ) : null}

      <CongregationTable
        congregations={sortedCongregations}
        onEdit={openEditModal}
        onToggleStatus={handleToggleStatusClick}
        onDelete={setDeleteTarget}
        onExport={handleExport}
        onBilling={setBillingTarget}
        exporting={exporting}
      />

      <CongregationFormModal
        isOpen={isFormOpen}
        congregation={editingCongregation}
        loading={saving}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <CongregationBillingModal
        isOpen={Boolean(billingTarget)}
        congregation={billingTarget}
        saving={saving}
        error={error}
        onClose={() => setBillingTarget(null)}
        onSave={handleSaveBilling}
      />

      {/* Dialog de DESACTIVACIÓN con motivo */}
      <DeactivateReasonDialog
        isOpen={Boolean(deactivateTarget)}
        congregationName={deactivateTarget?.name ?? ''}
        loading={saving}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      {/* Dialog de ACTIVACIÓN simple */}
      <ConfirmDialog
        isOpen={Boolean(activateTarget)}
        title="Activar congregación"
        description={`La congregación "${activateTarget?.name}" volverá a estar activa y sus usuarios podrán acceder.`}
        confirmLabel="Activar"
        danger={false}
        loading={saving}
        onConfirm={handleActivate}
        onCancel={() => setActivateTarget(null)}
      />

      {deleteTarget ? (
        <DeleteCongregationDialog
          congregation={deleteTarget}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </section>
  );
}
