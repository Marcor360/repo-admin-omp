import { useEffect, useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { ERROR_MESSAGES } from '../constants/messages';
import { getGlobalStats } from '../services/stats.service';
import type { GlobalStats } from '../types/stats.types';
import { getMaintenanceStatus, setMaintenanceMode } from '../services/system.service';
import type { MaintenanceStatus } from '../services/system.service';

// ─── Utilidades de tiempo ──────────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function formatDateTime(raw?: string | number) {
  if (!raw) return '';
  try {
    const date =
      typeof raw === 'object'
        ? new Date((raw as any)._seconds * 1000)
        : new Date(raw);
    return date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(raw);
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [maintenance, setMaintenance] = useState<MaintenanceStatus>({ active: false });
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState('');
  const [maintenanceNotice, setMaintenanceNotice] = useState('');
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

  // Cuenta regresiva
  const [timeLeft, setTimeLeft] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cargar datos ────────────────────────────────────────────────────────────
  async function loadStats() {
    setLoading(true);
    setError('');
    try {
      const [statsData, maintenanceData] = await Promise.all([
        getGlobalStats(),
        getMaintenanceStatus(),
      ]);
      setStats(statsData);
      setMaintenance(maintenanceData);
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.loadStats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  // ── Cuenta regresiva ────────────────────────────────────────────────────────
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (!maintenance.active || !maintenance.expiresAt) {
      setTimeLeft(0);
      return;
    }

    function tick() {
      const remaining = (maintenance.expiresAt ?? 0) - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        if (countdownRef.current) clearInterval(countdownRef.current);
        // El tiempo venció: recargar para que el UI refleje el estado real
        void loadStats();
      } else {
        setTimeLeft(remaining);
      }
    }

    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [maintenance.active, maintenance.expiresAt]);

  // ── Toggle mantenimiento ────────────────────────────────────────────────────
  async function handleToggleMaintenance() {
    setMaintenanceLoading(true);
    setMaintenanceError('');
    setMaintenanceNotice('');
    setShowMaintenanceConfirm(false);

    try {
      const result = await setMaintenanceMode(!maintenance.active);
      setMaintenanceNotice(result.message);
      const [updated, updatedStats] = await Promise.all([
        getMaintenanceStatus(),
        getGlobalStats(),
      ]);
      setMaintenance(updated);
      setStats(updatedStats);
    } catch (err: any) {
      setMaintenanceError(err.message || ERROR_MESSAGES.updateMaintenance);
    } finally {
      setMaintenanceLoading(false);
    }
  }

  if (loading) return <LoadingState label="Cargando resumen global..." />;
  if (error) return <ErrorState message={error} onRetry={loadStats} />;

  const maxHours = maintenance.maxHours ?? 5;
  const isExpired = maintenance.active && timeLeft === 0 && (maintenance.expiresAt ?? 0) < Date.now();

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen global de congregaciones y usuarios.</p>
        </div>
      </div>

      {/* ── Card de Mantenimiento ─────────────────────────────────────────── */}
      <div className={`maintenance-card${maintenance.active ? ' active' : ''}`}>
        <div className="maintenance-card-left">
          <div className="maintenance-card-icon">
            {maintenance.active ? '🔧' : '✅'}
          </div>

          <div className="maintenance-card-info">
            <h2 className="maintenance-card-title">Mantenimiento del Sistema</h2>

            {maintenance.active ? (
              <>
                <p className="maintenance-card-desc">
                  Activado el {formatDateTime(maintenance.activatedAt)} · Por:{' '}
                  <strong>{maintenance.activatedBy || '—'}</strong>
                </p>

                {/* Cuenta regresiva */}
                <div className="maintenance-countdown-row">
                  <span className="maintenance-countdown-label">
                    ⏱ Se desactivará automáticamente en:
                  </span>
                  <span className={`maintenance-countdown${timeLeft < 3600_000 ? ' urgent' : ''}`}>
                    {isExpired ? 'Finalizando...' : formatCountdown(timeLeft)}
                  </span>
                  <span className="maintenance-countdown-max">
                    (máx. {maxHours} h)
                  </span>
                </div>
              </>
            ) : (
              <p className="maintenance-card-desc">
                Todas las congregaciones están operando normalmente.
              </p>
            )}

            {maintenanceNotice && (
              <p className="maintenance-notice">{maintenanceNotice}</p>
            )}
            {maintenanceError && (
              <p className="maintenance-error">{maintenanceError}</p>
            )}
          </div>
        </div>

        <div className="maintenance-card-right">
          <div className={`maintenance-badge${maintenance.active ? ' on' : ' off'}`}>
            {maintenance.active ? 'ACTIVO' : 'INACTIVO'}
          </div>
          <button
            type="button"
            className={`maintenance-toggle-btn${maintenance.active ? ' deactivate' : ' activate'}`}
            onClick={() => setShowMaintenanceConfirm(true)}
            disabled={maintenanceLoading}
          >
            {maintenanceLoading
              ? (maintenance.active ? 'Desactivando...' : 'Activando...')
              : (maintenance.active ? '🔓 Desactivar mantenimiento' : '🔒 Activar mantenimiento')}
          </button>
        </div>
      </div>

      {/* Overlay de confirmación */}
      {showMaintenanceConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="maintenance-confirm-modal">
            <div className={`maintenance-confirm-header${maintenance.active ? '' : ' warn'}`}>
              <span>{maintenance.active ? '🔓' : '🔒'}</span>
              <div>
                <h2>
                  {maintenance.active
                    ? 'Desactivar mantenimiento'
                    : '¿Activar mantenimiento del sistema?'}
                </h2>
                <p>
                  {maintenance.active
                    ? 'Las congregaciones volverán a su estado anterior.'
                    : `TODAS las congregaciones se desactivarán hasta por ${maxHours} horas. Al vencer el tiempo, se reactivarán automáticamente.`}
                </p>
              </div>
            </div>
            <div className="maintenance-confirm-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowMaintenanceConfirm(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={maintenance.active ? 'btn-primary' : 'btn-danger'}
                onClick={handleToggleMaintenance}
              >
                {maintenance.active ? 'Sí, desactivar' : `Sí, activar (máx. ${maxHours} h)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Estadísticas ─────────────────────────────────────────────────── */}
      <div className="stats-grid">
        <Card title="Total de congregaciones" value={stats?.totalCongregations ?? 0} />
        <Card title="Congregaciones activas" value={stats?.activeCongregations ?? 0} />
        <Card title="Congregaciones inactivas" value={stats?.inactiveCongregations ?? 0} />
        <Card title="Usuarios activos" value={stats?.activeUsers ?? 0} />
        <Card title="Usuarios inactivos" value={stats?.inactiveUsers ?? 0} />
      </div>
    </section>
  );
}
