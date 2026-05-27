import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { CongregationStatsCards } from '../components/congregations/CongregationStatsCards';
import { CongregationStatusBadge } from '../components/congregations/CongregationStatusBadge';
import { LeadershipPanel } from '../components/congregations/LeadershipPanel';
import { EditUserModal } from '../components/users/EditUserModal';
import { ChangePasswordModal } from '../components/users/ChangePasswordModal';
import { RoleBadge } from '../components/users/RoleBadge';
import { UsersTable } from '../components/users/UsersTable';
import { DeleteUserDialog } from '../components/users/DeleteUserDialog';
import { UserStatusBadge } from '../components/users/UserStatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { Select } from '../components/ui/Select';
import { getCongregationById, updateCongregationLeadership } from '../services/congregations.service';
import { exportCongregationExcel } from '../services/congregations.service';
import { getCongregationStats } from '../services/stats.service';
import { getActiveUsersByCongregation, getUsersByCongregation, updateUser, changeUserPassword, deleteUser } from '../services/users.service';
import type { Congregation, CongregationLeadership } from '../types/congregation.types';
import { OMP_PLANS } from '../types/congregation.types';
import type { CongregationStats } from '../types/stats.types';
import type { AppUser, UpdateUserPayload, UserFilter } from '../types/user.types';
import { formatDate } from '../utils/formatDate';
import { getUserDisplayName } from '../utils/userDisplay';

export function CongregationDetailPage() {
  const { congregationId } = useParams<{ congregationId: string }>();
  const { user } = useAuth();

  const [congregation, setCongregation] = useState<Congregation | null>(null);
  const [stats, setStats] = useState<CongregationStats | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activeUsers, setActiveUsers] = useState<AppUser[]>([]);
  const [secretary, setSecretary] = useState<AppUser | null>(null);
  const [coordinator, setCoordinator] = useState<AppUser | null>(null);
  const [filter, setFilter] = useState<UserFilter>('all');
  const [loading, setLoading] = useState(true);
  const [savingLeadership, setSavingLeadership] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [editUserError, setEditUserError] = useState('');

  // Change password modal state
  const [passwordUser, setPasswordUser] = useState<AppUser | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Delete user state
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  async function loadDetail(selectedFilter: UserFilter = filter) {
    if (!congregationId) return;

    setLoading(true);
    setError('');

    try {
      const congregationResponse = await getCongregationById(congregationId);
      if (!congregationResponse) {
        setError('No se encontró la congregación.');
        return;
      }

      const [statsResponse, usersResponse, activeUsersResponse] =
        await Promise.all([
          getCongregationStats(congregationId),
          getUsersByCongregation(congregationId, selectedFilter),
          getActiveUsersByCongregation(congregationId)
        ]);

      const secretaryResponse = activeUsersResponse.find(u => u.uid === congregationResponse.leadership?.secretaryUserId) || null;
      const coordinatorResponse = activeUsersResponse.find(u => u.uid === congregationResponse.leadership?.coordinatorUserId) || null;

      setCongregation(congregationResponse);
      setStats(statsResponse);
      setUsers(usersResponse);
      setActiveUsers(activeUsersResponse);
      setSecretary(secretaryResponse);
      setCoordinator(coordinatorResponse);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail(filter);
  }, [congregationId]);

  async function handleFilterChange(nextFilter: UserFilter) {
    setFilter(nextFilter);
    setLoading(true);
    setError('');

    try {
      if (!congregationId) return;
      const response = await getUsersByCongregation(congregationId, nextFilter);
      setUsers(response);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveLeadership(leadership: CongregationLeadership) {
    if (!congregationId || !user) return;

    setSavingLeadership(true);
    setNotice('');
    setError('');

    try {
      await updateCongregationLeadership(congregationId, leadership);
      setNotice('Liderazgo actualizado correctamente.');
      await loadDetail(filter);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setSavingLeadership(false);
    }
  }

  async function handleEditUser(user: AppUser) {
    setEditingUser(user);
    setEditUserError('');
  }

  async function handleSaveUser(userId: string, payload: UpdateUserPayload) {
    if (!congregationId) return;
    setSavingUser(true);
    setEditUserError('');
    try {
      const updated = await updateUser(congregationId, userId, payload);
      // Update the user in local state without refetching
      setUsers((prev) => prev.map((u) => (u.uid === userId || u.id === userId) ? { ...u, ...updated } : u));
      setActiveUsers((prev) => prev.map((u) => (u.uid === userId || u.id === userId) ? { ...u, ...updated } : u));
      setEditingUser(null);
      setNotice(`Usuario "${updated.displayName ?? userId}" actualizado correctamente.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setEditUserError(err.message || 'Error actualizando usuario.');
    } finally {
      setSavingUser(false);
    }
  }

  async function handleChangePassword(user: AppUser) {
    setPasswordUser(user);
    setPasswordError('');
  }

  async function handleSavePassword(userId: string, password: string) {
    if (!congregationId) return;
    setSavingPassword(true);
    setPasswordError('');
    try {
      await changeUserPassword(congregationId, userId, password);
      setPasswordUser(null);
      const target = users.find((u) => u.uid === userId || u.id === userId);
      setNotice(`Contraseña de "${target ? (target.displayName ?? target.email ?? userId) : userId}" actualizada correctamente.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Error cambiando contraseña.');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteUser() {
    if (!congregationId || !userToDelete) return;
    setDeletingUser(true);
    setError('');
    const userId = userToDelete.uid || userToDelete.id;
    try {
      await deleteUser(congregationId, userId);
      setUsers((prev) => prev.filter((u) => u.uid !== userId && u.id !== userId));
      setActiveUsers((prev) => prev.filter((u) => u.uid !== userId && u.id !== userId));
      setNotice(`Usuario "${userToDelete.displayName || userToDelete.email}" eliminado correctamente.`);
      setTimeout(() => setNotice(''), 4000);
      setUserToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Error eliminando usuario.');
    } finally {
      setDeletingUser(false);
    }
  }

  async function handleExport() {
    if (!congregationId || !congregation) return;
    setExporting(true);
    setError('');
    try {
      await exportCongregationExcel(congregationId, congregation.name);
    } catch (err: any) {
      setError(err.message || 'Error exportando datos.');
    } finally {
      setExporting(false);
    }
  }

  if (loading && !congregation) return <LoadingState label="Cargando detalle de congregación..." />;
  if (error && !congregation) return <ErrorState message={error} onRetry={() => loadDetail(filter)} />;
  if (!congregation) return <ErrorState message="No se encontró la congregación." />;

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <Link to="/congregations" className="muted-link">
            ← Congregaciones
          </Link>
          <h1>{congregation.name}</h1>
          <p>Detalle administrativo de la congregación.</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleExport}
          disabled={exporting}
          title="Descargar Excel con todos los datos de la congregación"
        >
          {exporting ? 'Exportando...' : '📥 Descargar Excel'}
        </Button>
      </div>

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <ErrorState message={error} onRetry={() => loadDetail(filter)} /> : null}

      <div className="detail-grid">
        <Card>
          <h2>Datos básicos</h2>
          <dl className="details-list">
            <div>
              <dt>Nombre</dt>
              <dd>{congregation.name}</dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>{[congregation.city, congregation.state, congregation.country].filter(Boolean).join(', ') || 'Sin ubicación'}</dd>
            </div>
            <div>
              <dt>Circuito</dt>
              <dd>{congregation.circuit || 'Sin circuito'}</dd>
            </div>
            <div>
              <dt>Dominio</dt>
              <dd>
                {congregation.domain ? (
                  <span style={{fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700}}>
                    @{congregation.domain.replace('.com', '')} &mdash; admin@{congregation.domain}
                  </span>
                ) : 'Sin dominio'}
              </dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>
                {(() => {
                  const planKey = congregation.plan ?? 'basico';
                  const plan = OMP_PLANS[planKey];
                  return (
                    <span
                      className="plan-badge"
                      style={{ '--plan-color': plan.color } as React.CSSProperties}
                    >
                      {plan.label}
                    </span>
                  );
                })()}
              </dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                <CongregationStatusBadge isActive={congregation.isActive} />
              </dd>
            </div>
            <div>
              <dt>Fecha de creación</dt>
              <dd>{formatDate(congregation.createdAt)}</dd>
            </div>
            <div>
              <dt>Última actualización</dt>
              <dd>{formatDate(congregation.updatedAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2>Liderazgo actual</h2>
          <dl className="details-list">
            <div>
              <dt>Secretario</dt>
              <dd>{getUserDisplayName(secretary)}</dd>
            </div>
            <div>
              <dt>Coordinador</dt>
              <dd>{getUserDisplayName(coordinator)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {stats ? <CongregationStatsCards stats={stats} /> : null}

      {/* Capacidad del plan */}
      {stats && (() => {
        const planKey = congregation.plan ?? 'basico';
        const plan = OMP_PLANS[planKey];
        const used = stats.activeUsers ?? 0;
        const pct = Math.min(100, Math.round((used / plan.maxUsers) * 100));
        const remaining = Math.max(0, plan.maxUsers - used);
        const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : plan.color;
        return (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h2 style={{ marginBottom: '2px' }}>Capacidad del plan</h2>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
                  <span className="plan-badge" style={{ '--plan-color': plan.color } as React.CSSProperties}>
                    {plan.label}
                  </span>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: barColor }}>{remaining}</span>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.8rem' }}>usuarios disponibles</p>
              </div>
            </div>
            <div className="plan-progress-track">
              <div
                className="plan-progress-bar"
                style={{ width: `${pct}%`, background: barColor } as React.CSSProperties}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.8rem', color: 'var(--muted)' }}>
              <span>{used} usuarios activos</span>
              <span>{plan.maxUsers} máximo</span>
            </div>
          </Card>
        );
      })()}

      <LeadershipPanel
        congregation={congregation}
        activeUsers={activeUsers}
        loading={savingLeadership}
        onSave={handleSaveLeadership}
      />

      <Card>
        <div className="section-header">
          <div>
            <h2>Usuarios de la congregación</h2>
            <p>Usa ✏️ Editar para cambiar datos o 🔑 Clave para cambiar la contraseña.</p>
          </div>
          <Select
            id="user-filter"
            value={filter}
            onChange={(event) => handleFilterChange(event.target.value as UserFilter)}
            options={[
              { label: 'Todos', value: 'all' },
              { label: 'Activos', value: 'active' },
              { label: 'Inactivos', value: 'inactive' },
              { label: 'Administradores', value: 'admins' },
              { label: 'Supervisores', value: 'supervisors' },
              { label: 'Usuarios', value: 'users' },
            ]}
          />
        </div>

        {loading ? <LoadingState label="Cargando usuarios..." /> : <UsersTable users={users} onEdit={handleEditUser} onChangePassword={handleChangePassword} onDelete={(u) => setUserToDelete(u)} />}
      </Card>

      <EditUserModal
        user={editingUser}
        congregationId={congregationId ?? ''}
        isOpen={editingUser !== null}
        saving={savingUser}
        error={editUserError}
        onClose={() => { setEditingUser(null); setEditUserError(''); }}
        onSave={handleSaveUser}
      />

      <ChangePasswordModal
        user={passwordUser}
        isOpen={passwordUser !== null}
        saving={savingPassword}
        error={passwordError}
        onClose={() => { setPasswordUser(null); setPasswordError(''); }}
        onSave={handleSavePassword}
      />

      <DeleteUserDialog
        user={userToDelete}
        loading={deletingUser}
        onCancel={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
      />

      <Card>
        <h2>Resumen de permisos visibles</h2>
        <div className="legend-row">
          <RoleBadge role="admin" />
          <RoleBadge role="supervisor" />
          <RoleBadge role="user" />
          <UserStatusBadge isActive />
          <UserStatusBadge isActive={false} />
        </div>
        <div className="actions-right">
          <Button type="button" variant="secondary" onClick={() => loadDetail(filter)}>
            Recargar
          </Button>
        </div>
      </Card>
    </section>
  );
}
