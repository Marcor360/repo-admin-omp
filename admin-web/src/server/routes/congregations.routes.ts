import { Router } from 'express';
import ExcelJS from 'exceljs';
import { requireOwner } from '../middleware/requireOwner';
import { db, adminAuth } from '../firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkAndAutoDeactivate } from './system.routes';
import { BILLING_PLANS, type BillingPlanKey, isBillingPlanKey, PLAN_LABELS, PLAN_USER_LIMITS, PLAN_PRICES_MXN } from '../../shared/contracts/billing';
import { resolvePlanKey } from '../utils/planLegacy';
import { parseOrRespond } from '../utils/validate';
import { congregationIdParamSchema, activityQuerySchema, lifecycleBodySchema, deleteCongregationBodySchema } from '../schemas/congregationDetail.schemas';
import { TtlCache } from '../utils/ttlCache';
import { getCurrentMonthId } from '../utils/monthId';
import { writeAuditLog } from '../utils/auditLog';
import { type LifecycleStatus, deriveLifecycleStatus, isTransitionAllowed } from '../domain/lifecycle';
import { getStripe } from '../utils/stripeClient';

const router = Router();

// GET /api/congregations
router.get('/', requireOwner, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado. Revisa las variables FIREBASE_* o Application Default Credentials.' });
    const snapshot = await db.collection('congregations').get();
    const congregationsPromises = snapshot.docs.map(async doc => {
      const id = doc.id;
      const data = doc.data();
      
      const secretaryId = data.leadership?.secretaryUserId;
      const coordinatorId = data.leadership?.coordinatorUserId;

      const [
        totalActiveSnap,
        systemActiveSnap,
        totalInactiveSnap,
        systemInactiveSnap,
        secretaryDoc,
        coordinatorDoc
      ] = await Promise.all([
        db!.collection('users').where('congregationId', '==', id).where('isActive', '==', true).count().get(),
        db!.collection('users').where('congregationId', '==', id).where('isActive', '==', true).where('isSystemUser', '==', true).count().get(),
        db!.collection('users').where('congregationId', '==', id).where('isActive', '==', false).count().get(),
        db!.collection('users').where('congregationId', '==', id).where('isActive', '==', false).where('isSystemUser', '==', true).count().get(),
        secretaryId ? db!.collection('users').doc(secretaryId).get() : Promise.resolve(null),
        coordinatorId ? db!.collection('users').doc(coordinatorId).get() : Promise.resolve(null)
      ]);

      const secData = secretaryDoc?.data();
      const coordData = coordinatorDoc?.data();

      return {
        id,
        ...data,
        isActive: data.isActive !== undefined ? data.isActive : (data.active !== undefined ? data.active : true),
        nameKey: data.nameKey || data.code || '',
        planKey: resolvePlanKey(data),
        lifecycleStatus: deriveLifecycleStatus(data),
        activeUsersCount: totalActiveSnap.data().count - systemActiveSnap.data().count,
        inactiveUsersCount: totalInactiveSnap.data().count - systemInactiveSnap.data().count,
        secretaryName: secData ? (secData.displayName || secData.name || secData.email || 'Sin nombre') : 'Sin asignar',
        coordinatorName: coordData ? (coordData.displayName || coordData.name || coordData.email || 'Sin nombre') : 'Sin asignar'
      };
    });

    const congregations = await Promise.all(congregationsPromises);
    res.json(congregations);
  } catch (error) {
    console.error('Error fetching congregations:', error);
    res.status(500).json({ error: 'Error fetching congregations', details: error instanceof Error ? error.message : String(error) });
  }
});

// GET /api/congregations/:id
router.get('/:id', requireOwner, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    const doc = await db.collection('congregations').doc(req.params.id as string).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Congregation not found' });
    }
    const data = doc.data() as any;
    res.json({
      id: doc.id,
      ...data,
      isActive: data.isActive !== undefined ? data.isActive : (data.active !== undefined ? data.active : true),
      nameKey: data.nameKey || data.code || '',
      planKey: resolvePlanKey(data),
      lifecycleStatus: deriveLifecycleStatus(data),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching congregation' });
  }
});

// POST /api/congregations
router.post('/', requireOwner, async (req, res) => {
  try {
    if (!db || !adminAuth) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    const { name, city, state, country, circuit, planKey = 'omp_80', isActive = true } = req.body;
    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'Name must be at least 3 characters long' });
    }
    if (!isBillingPlanKey(planKey)) {
      return res.status(400).json({ error: `Plan inválido. Opciones: ${BILLING_PLANS.join(', ')}` });
    }

    // Generate nameKey and domain
    const nameKey = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    const domain = `${nameKey}.com`;
    const timestamp = FieldValue.serverTimestamp();

    // Create congregation document
    const newCongregation = {
      name,
      nameKey,
      domain,
      city: city || null,
      state: state || null,
      country: country || null,
      circuit: circuit || null,
      billing: {
        billingMode: 'disabled',
        status: 'none',
        planKey,
        activeUsersLimit: PLAN_USER_LIMITS[planKey],
        userLimit: PLAN_USER_LIMITS[planKey],
      },
      isActive,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: req.userEmail,
      updatedBy: req.userEmail
    };

    const docRef = await db.collection('congregations').add(newCongregation);
    const congregationId = docRef.id;

    // Generate temporary password (12 chars)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    let tempPassword = '';
    for (let i = 0; i < 12; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Create first admin user in Firebase Auth
    const adminEmail = `admin@${domain}`;
    let authUser;
    try {
      authUser = await adminAuth.createUser({
        email: adminEmail,
        password: tempPassword,
        displayName: `Admin ${name}`,
      });
    } catch (authError: any) {
      // Rollback congregation if user creation fails
      await docRef.delete();
      return res.status(400).json({ error: `Error creando usuario admin: ${authError.message}` });
    }

    // Create user document in Firestore
    const userTimestamp = FieldValue.serverTimestamp();
    await db.collection('users').doc(authUser.uid).set({
      uid: authUser.uid,
      email: adminEmail,
      displayName: `Admin ${name}`,
      firstName: 'Admin',
      lastName: name,
      role: 'admin',
      isActive: true,
      isSystemUser: true,        // usuario creado automáticamente por el sistema — no cuenta para el límite del plan
      status: 'active',
      congregationId,
      congregationDomain: domain,
      passwordIsTemporary: true,
      createdAt: userTimestamp,
      updatedAt: userTimestamp,
      createdBy: req.userEmail,
    });

    const doc = await docRef.get();
    const data = doc.data() as any;

    res.status(201).json({
      congregation: {
        id: doc.id,
        ...data,
        isActive: data.isActive !== undefined ? data.isActive : true,
        nameKey: data.nameKey || '',
        domain: data.domain || domain,
        planKey: resolvePlanKey(data),
        lifecycleStatus: deriveLifecycleStatus(data),
      },
      firstAdmin: {
        email: adminEmail,
        password: tempPassword,
        uid: authUser.uid,
      },
    });
  } catch (error: any) {
    console.error('Error creating congregation:', error);
    res.status(500).json({ error: error.message || 'Error creating congregation' });
  }
});

// PATCH /api/congregations/:id
router.patch('/:id', requireOwner, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    const { name, city, state, country, circuit } = req.body;
    const planKey: BillingPlanKey | undefined = req.body.planKey;
    if (name !== undefined && (!name || name.length < 3)) {
      return res.status(400).json({ error: 'Name must be at least 3 characters long' });
    }
    if (planKey !== undefined && !isBillingPlanKey(planKey)) {
      return res.status(400).json({ error: `Plan inválido. Opciones: ${BILLING_PLANS.join(', ')}` });
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.userEmail
    };

    if (name) {
      updates.name = name;
      updates.nameKey = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    }
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (country !== undefined) updates.country = country;
    if (circuit !== undefined) updates.circuit = circuit;
    if (planKey !== undefined) {
      updates['billing.planKey'] = planKey;
      updates['billing.activeUsersLimit'] = PLAN_USER_LIMITS[planKey];
      updates['billing.userLimit'] = PLAN_USER_LIMITS[planKey];
    }

    await db.collection('congregations').doc(req.params.id as string).update(updates);
    const doc = await db.collection('congregations').doc(req.params.id as string).get();
    const data = doc.data();
    res.json({ id: doc.id, ...data, planKey: resolvePlanKey(data), lifecycleStatus: deriveLifecycleStatus(data) });
  } catch (error) {
    res.status(500).json({ error: 'Error updating congregation' });
  }
});

/**
 * Único punto de escritura de estado de ciclo de vida. `isActive` (el campo
 * que lee la app móvil directamente, sin pasar por este panel) se deriva
 * siempre de `lifecycleStatus` en la misma llamada a `update()` — nunca por
 * separado — para que nunca puedan desincronizarse.
 */
async function applyLifecycleWrite(
  congRef: FirebaseFirestore.DocumentReference,
  to: LifecycleStatus,
  actor: string,
  reason?: string,
  until?: string | null,
): Promise<void> {
  const updateData: Record<string, unknown> = {
    lifecycleStatus: to,
    isActive: to === 'active',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor,
  };

  updateData.pauseReason = to === 'paused' ? (reason || 'Pausa manual') : FieldValue.delete();
  updateData.pausedUntil = to === 'paused' && until ? new Date(until) : FieldValue.delete();
  updateData.blockReason = to === 'blocked' ? (reason || 'Bloqueo administrativo') : FieldValue.delete();

  // Compatibilidad con el campo legado que ya leía /access-check y el export.
  updateData.deactivationReason = to === 'active'
    ? FieldValue.delete()
    : (reason || (to === 'paused' ? 'Pausa manual' : to === 'blocked' ? 'Bloqueo administrativo' : 'Archivada'));

  if (to === 'active') {
    updateData.restoredBy = actor;
    updateData.restoredAt = FieldValue.serverTimestamp();
  }

  await congRef.update(updateData);
}

// PATCH /api/congregations/:id/status — atajo legado (isActive boolean).
// Mantenido por compatibilidad con el botón "Activar/Desactivar" actual;
// internamente escribe lifecycleStatus igual que /lifecycle para que nunca
// queden desincronizados.
router.patch('/:id/status', requireOwner, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    const { isActive, reason } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const congRef = db.collection('congregations').doc(req.params.id as string);
    await applyLifecycleWrite(congRef, isActive ? 'active' : 'paused', req.userEmail ?? 'superadmin', reason);

    await writeAuditLog({
      actor: req.userEmail ?? 'superadmin',
      action: 'lifecycle_change',
      target: req.params.id as string,
      metadata: { to: isActive ? 'active' : 'paused', reason: reason ?? null, via: 'legacy_status_endpoint' },
    });

    res.json({ success: true, isActive });
  } catch (error) {
    res.status(500).json({ error: 'Error updating status' });
  }
});

// PATCH /api/congregations/:id/lifecycle — activar/pausar/bloquear/archivar.
router.patch('/:id/lifecycle', requireOwner, async (req, res) => {
  const params = parseOrRespond(congregationIdParamSchema, req.params, res);
  if (!params) return;
  const body = parseOrRespond(lifecycleBodySchema, req.body, res);
  if (!body) return;
  if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

  const to = body.status as LifecycleStatus;
  if ((to === 'paused' || to === 'blocked') && !body.reason) {
    return res.status(400).json({ error: `El estado "${to}" requiere un motivo (reason).` });
  }

  try {
    const congRef = db.collection('congregations').doc(params.id);
    const congDoc = await congRef.get();
    if (!congDoc.exists) return res.status(404).json({ error: 'Congregación no encontrada.' });

    const from = deriveLifecycleStatus(congDoc.data());
    if (!isTransitionAllowed(from, to)) {
      return res.status(409).json({ error: `No se puede pasar de "${from}" a "${to}".` });
    }

    await applyLifecycleWrite(congRef, to, req.userEmail ?? 'superadmin', body.reason, body.until);

    await writeAuditLog({
      actor: req.userEmail ?? 'superadmin',
      action: 'lifecycle_change',
      target: params.id,
      metadata: { from, to, reason: body.reason ?? null, until: body.until ?? null },
    });

    res.json({ success: true, from, to });
  } catch (error) {
    console.error('Error cambiando el ciclo de vida:', error);
    res.status(500).json({ error: 'Error cambiando el ciclo de vida de la congregación.' });
  }
});

// GET /api/congregations/:id/access-check  — SIN autenticación (para la app móvil)
router.get('/:id/access-check', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

    const congregationId = req.params.id as string;

    // 1. Verificar si hay mantenimiento de sistema global activo (auto-desactivar si venció)
    if (db) await checkAndAutoDeactivate(db);
    const maintenanceDoc = await db.collection('settings').doc('maintenance').get();
    if (maintenanceDoc.exists && maintenanceDoc.data()?.active === true) {
      const expiresAt: number = maintenanceDoc.data()?.expiresAt || 0;
      const msLeft = Math.max(0, expiresAt - Date.now());
      const hLeft = Math.ceil(msLeft / 3600000);
      return res.status(503).json({
        allowed: false,
        systemMaintenance: true,
        reason: 'Mantenimiento de sistema',
        expiresAt,
        message: `El sistema está en mantenimiento. Tiempo restante aproximado: ${hLeft} hora(s). Por favor intenta más tarde.`,
      });
    }

    // 2. Verificar estado de la congregación específica
    const congDoc = await db.collection('congregations').doc(congregationId).get();
    if (!congDoc.exists) {
      return res.status(404).json({
        allowed: false,
        reason: 'Congregación no encontrada',
        message: `No existe una congregación con el ID: ${congregationId}`,
      });
    }

    const cong = congDoc.data()!;
    if (cong.isActive === false) {
      const lifecycleStatus = deriveLifecycleStatus(cong);
      const statusMessages: Record<string, string> = {
        paused: `La congregación "${cong.name}" (${congregationId}) está pausada temporalmente. Motivo: ${cong.pauseReason || cong.deactivationReason || 'Pausa manual'}.`,
        blocked: `La congregación "${cong.name}" (${congregationId}) está bloqueada administrativamente. Motivo: ${cong.blockReason || cong.deactivationReason || 'Bloqueo administrativo'}.`,
        archived: `La congregación "${cong.name}" (${congregationId}) fue archivada y ya no está disponible.`,
      };
      return res.status(403).json({
        allowed: false,
        congregationId: congregationId,
        congregationName: cong.name || '',
        lifecycleStatus,
        reason: cong.blockReason || cong.pauseReason || cong.deactivationReason || 'Desactivación temporal',
        message: statusMessages[lifecycleStatus] || `La congregación "${cong.name}" (${congregationId}) está desactivada.`,
      });
    }

    return res.json({
      allowed: true,
      congregationId: congregationId,
      congregationName: cong.name || '',
    });

  } catch (error) {
    res.status(500).json({ error: 'Error verificando acceso' });
  }
});


// PATCH /api/congregations/:id/leadership
router.patch('/:id/leadership', requireOwner, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    const { secretaryUserId, coordinatorUserId } = req.body;
    
    // Validaciones basicas
    const usersToVerify = [];
    if (secretaryUserId) usersToVerify.push(secretaryUserId);
    if (coordinatorUserId) usersToVerify.push(coordinatorUserId);

    for (const uid of usersToVerify) {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return res.status(400).json({ error: `User ${uid} not found` });
      }
      const userData = userDoc.data();
      if (userData?.congregationId !== req.params.id) {
        return res.status(400).json({ error: `User ${uid} does not belong to this congregation` });
      }
      if (userData?.isActive === false) {
        return res.status(400).json({ error: `User ${uid} is not active` });
      }
    }

    const updates = {
      'leadership.secretaryUserId': secretaryUserId === null ? null : secretaryUserId || undefined,
      'leadership.coordinatorUserId': coordinatorUserId === null ? null : coordinatorUserId || undefined,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.userEmail
    };

    // Filtrar undefined
    Object.keys(updates).forEach(key => updates[key as keyof typeof updates] === undefined && delete updates[key as keyof typeof updates]);

    await db.collection('congregations').doc(req.params.id as string).update(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating leadership' });
  }
});

// GET /api/congregations/:id/org-chart — Organigrama de solo lectura.
// Generado automáticamente por reconcileOrgChartOnUserWrite en el principal a
// partir de servicePosition/serviceDepartment de cada usuario. Nunca se
// escribe desde aquí: cualquier cambio manual sería sobrescrito por ese
// trigger.
router.get('/:id/org-chart', requireOwner, async (req, res) => {
  const params = parseOrRespond(congregationIdParamSchema, req.params, res);
  if (!params) return;
  if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

  try {
    const congRef = db.collection('congregations').doc(params.id);
    const [deptSnap, asgSnap] = await Promise.all([
      congRef.collection('departments').orderBy('order', 'asc').get(),
      congRef.collection('departmentAssignments').get(),
    ]);

    const assignmentsByDept = new Map<string, Record<string, unknown>[]>();
    let coordinador: Record<string, unknown> | null = null;
    let secretario: Record<string, unknown> | null = null;

    asgSnap.docs.forEach((doc) => {
      const data = doc.data();
      const entry = { id: doc.id, ...data };
      const deptId = String(data.departmentId ?? '');
      if (!assignmentsByDept.has(deptId)) assignmentsByDept.set(deptId, []);
      assignmentsByDept.get(deptId)!.push(entry);

      if (data.position === 'coordinador' && !coordinador) coordinador = entry;
      if (data.position === 'secretario' && !secretario) secretario = entry;
    });

    const departments = deptSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        order: data.order ?? 50,
        isActive: data.isActive !== false,
        assignments: assignmentsByDept.get(doc.id) ?? [],
      };
    });

    res.json({
      readOnly: true,
      readOnlyNotice: 'Este organigrama se genera automáticamente desde las posiciones de servicio de cada usuario. Para cambiarlo, edita la posición del usuario — no se puede editar aquí.',
      coordinador,
      secretario,
      departments,
    });
  } catch (error) {
    console.error('Error obteniendo organigrama:', error);
    res.status(500).json({ error: 'Error obteniendo el organigrama.' });
  }
});

// GET /api/congregations/:id/activity — Timeline unificado de solo lectura:
// changeLogs (congregation-scoped, escrito por el principal — hoy sin
// escritores activos, puede venir vacío) + adminAuditLogs (escrito por este
// panel).
router.get('/:id/activity', requireOwner, async (req, res) => {
  const params = parseOrRespond(congregationIdParamSchema, req.params, res);
  if (!params) return;
  const query = parseOrRespond(activityQuerySchema, req.query, res);
  if (!query) return;
  if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

  try {
    const [changeLogsSnap, auditLogsSnap] = await Promise.all([
      db.collection('congregations').doc(params.id).collection('changeLogs')
        .orderBy('createdAt', 'desc').limit(query.limit).get(),
      db.collection('adminAuditLogs')
        .where('target', '==', params.id)
        .orderBy('createdAt', 'desc').limit(query.limit).get(),
    ]);

    const toEntry = (source: 'changeLog' | 'adminAuditLog') => (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      const createdAt = data.createdAt as FirebaseFirestore.Timestamp | undefined;
      return {
        id: doc.id,
        source,
        actor: data.actor ?? data.updatedBy ?? data.createdBy ?? 'desconocido',
        action: data.action ?? data.type ?? 'evento',
        metadata: data.metadata ?? null,
        createdAtMillis: createdAt?.toMillis() ?? 0,
      };
    };

    const entries = [
      ...changeLogsSnap.docs.map(toEntry('changeLog')),
      ...auditLogsSnap.docs.map(toEntry('adminAuditLog')),
    ]
      .sort((a, b) => b.createdAtMillis - a.createdAtMillis)
      .slice(0, query.limit);

    res.json({ entries });
  } catch (error) {
    console.error('Error obteniendo actividad:', error);
    res.status(500).json({ error: 'Error obteniendo la actividad de la congregación.' });
  }
});

const overviewCache = new TtlCache<Record<string, unknown>>(30_000);

// GET /api/congregations/:id/overview — Agregados en una sola respuesta.
// Reusa dashboardSummary/{cid} cuando existe; calcula solo lo que falta.
// Cacheado 30s por congregación (un solo super admin no justifica más).
router.get('/:id/overview', requireOwner, async (req, res) => {
  const params = parseOrRespond(congregationIdParamSchema, req.params, res);
  if (!params) return;
  if (!db || !adminAuth) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

  const cached = overviewCache.get(params.id);
  if (cached) {
    res.json({ ...cached, fromCache: true });
    return;
  }

  try {
    const congDoc = await db.collection('congregations').doc(params.id).get();
    if (!congDoc.exists) return res.status(404).json({ error: 'Congregación no encontrada.' });
    const cong = congDoc.data()!;

    const monthId = getCurrentMonthId();
    // Sin `isSystemUser != true`: Firestore exige un índice compuesto nuevo
    // para esa combinación de filtros. En vez de eso, contamos por rol con
    // igualdades simples (ya indexadas, mismo patrón que GET /) y restamos
    // el usuario admin del sistema aparte — siempre se crea con role:'admin'.
    const usersActiveByRole = (role: string) =>
      db!.collection('users')
        .where('congregationId', '==', params.id)
        .where('isActive', '==', true)
        .where('role', '==', role)
        .count().get();

    const [
      dashboardSummaryDoc,
      adminCountSnap,
      supervisorCountSnap,
      userCountSnap,
      systemActiveCountSnap,
      activeUsersSelectSnap,
      monthlyTerritorySnap,
      reportsCountSnap,
      meetingsThisMonthSnap,
    ] = await Promise.all([
      db.collection('dashboardSummary').doc(params.id).get(),
      usersActiveByRole('admin'),
      usersActiveByRole('supervisor'),
      usersActiveByRole('user'),
      db.collection('users')
        .where('congregationId', '==', params.id)
        .where('isActive', '==', true)
        .where('isSystemUser', '==', true)
        .count().get(),
      db.collection('users')
        .where('congregationId', '==', params.id)
        .where('isActive', '==', true)
        .select('uid', 'isSystemUser')
        .get(),
      db.collection('congregations').doc(params.id).collection('monthlyTerritoryAssignments').doc(monthId).get(),
      db.collection('congregations').doc(params.id).collection('preachingReports').doc(monthId).collection('submissions').count().get(),
      db.collection('congregations').doc(params.id).collection('meetings')
        .where('startDate', '>=', new Date(new Date().getFullYear(), new Date().getMonth(), 1))
        .count().get(),
    ]);

    const usersByRole = {
      // Resta el/los admin(es) de sistema: siempre tienen role:'admin', nunca supervisor/user.
      admin: Math.max(0, adminCountSnap.data().count - systemActiveCountSnap.data().count),
      supervisor: supervisorCountSnap.data().count,
      user: userCountSnap.data().count,
    };
    const activeUsersCount = usersByRole.admin + usersByRole.supervisor + usersByRole.user;

    // Sesión reciente (30 días) resuelta vía Firebase Auth — no hay campo
    // equivalente en Firestore en el principal.
    const uids = activeUsersSelectSnap.docs
      .filter((doc) => doc.data().isSystemUser !== true)
      .map((doc) => String(doc.data().uid ?? doc.id))
      .filter(Boolean);
    let usersWithRecentSession = 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (let i = 0; i < uids.length; i += 100) {
      const chunk = uids.slice(i, i + 100);
      const result = await adminAuth.getUsers(chunk.map((uid) => ({ uid })));
      for (const userRecord of result.users) {
        const lastSignIn = userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime).getTime() : 0;
        if (lastSignIn >= thirtyDaysAgo) usersWithRecentSession += 1;
      }
    }

    const territoriesAssigned = monthlyTerritorySnap.exists
      ? ((monthlyTerritorySnap.data()?.assignments as { territoryIds?: string[] }[] | undefined) ?? [])
          .reduce((sum, target) => sum + (target.territoryIds?.length ?? 0), 0)
      : 0;

    const planKey = resolvePlanKey(cong);
    const limit = PLAN_USER_LIMITS[planKey];

    const overview = {
      congregationId: params.id,
      congregationName: cong.name ?? '',
      plan: {
        key: planKey,
        label: PLAN_LABELS[planKey],
        limit,
        priceMxn: PLAN_PRICES_MXN[planKey],
        activeUsersCount,
        occupancyPct: Math.min(100, Math.round((activeUsersCount / limit) * 100)),
      },
      billing: {
        billingMode: cong.billing?.billingMode ?? 'disabled',
        status: cong.billing?.status ?? 'none',
      },
      usersByRole,
      usersWithRecentSession,
      meetingsThisMonth: meetingsThisMonthSnap.data().count,
      territoriesAssigned,
      reportsThisMonth: reportsCountSnap.data().count,
      dashboardSummary: dashboardSummaryDoc.exists ? dashboardSummaryDoc.data() : null,
      generatedAt: Date.now(),
    };

    overviewCache.set(params.id, overview);
    res.json({ ...overview, fromCache: false });
  } catch (error) {
    console.error('Error obteniendo overview:', error);
    res.status(500).json({ error: 'Error obteniendo el resumen de la congregación.' });
  }
});

// PATCH /api/congregations/:id/billing
router.patch('/:id/billing', requireOwner, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    
    const {
      billingMode, status,
      exemptReason, exemptUntil,
      stripeCustomerId, stripeSubscriptionId, stripePriceId
    } = req.body;
    const planKey: BillingPlanKey | undefined = req.body.planKey;

    if (!billingMode) {
      return res.status(400).json({ error: 'El billingMode es requerido.' });
    }
    if (planKey !== undefined && !isBillingPlanKey(planKey)) {
      return res.status(400).json({ error: `Plan inválido. Opciones: ${BILLING_PLANS.join(', ')}` });
    }

    const updates: Record<string, unknown> = {
      'billing.billingMode': billingMode,
      'billing.status': status || 'none',
      'billing.updatedAt': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.userEmail
    };

    if (planKey !== undefined) {
      updates['billing.planKey'] = planKey;
      updates['billing.activeUsersLimit'] = PLAN_USER_LIMITS[planKey];
      updates['billing.userLimit'] = PLAN_USER_LIMITS[planKey];
    }

    if (exemptReason !== undefined) updates['billing.exemptReason'] = exemptReason;
    
    if (exemptUntil !== undefined) {
      if (exemptUntil === null) {
        updates['billing.exemptUntil'] = null;
      } else {
        updates['billing.exemptUntil'] = FieldValue.serverTimestamp(); // Simplificación para la BD real, o usar Timestamp
        // Como viene del cliente, es mejor usar la fecha parseada
        updates['billing.exemptUntil'] = new Date(exemptUntil);
      }
    }

    if (stripeCustomerId !== undefined) updates['billing.stripeCustomerId'] = stripeCustomerId;
    if (stripeSubscriptionId !== undefined) updates['billing.stripeSubscriptionId'] = stripeSubscriptionId;
    if (stripePriceId !== undefined) updates['billing.stripePriceId'] = stripePriceId;

    await db.collection('congregations').doc(req.params.id as string).update(updates);
    
    const doc = await db.collection('congregations').doc(req.params.id as string).get();
    res.json({ success: true, billing: doc.data()?.billing });
  } catch (error) {
    console.error('Error updating billing:', error);
    res.status(500).json({ error: 'Error actualizando facturación' });
  }
});

// GET /api/congregations/:id/export  — Exportar datos completos a Excel
router.get('/:id/export', requireOwner, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

  const congregationId = req.params.id as string;

  try {
    // 1. Obtener datos de la congregación
    const congDoc = await db.collection('congregations').doc(congregationId).get();
    if (!congDoc.exists) return res.status(404).json({ error: 'Congregación no encontrada.' });
    const cong = congDoc.data() as any;

    // 2. Obtener todos los usuarios
    const usersSnap = await db.collection('users')
      .where('congregationId', '==', congregationId)
      .get();
    const users = usersSnap.docs.map(d => d.data() as any);

    // Helper para formatear fechas de Firestore
    const fmt = (val: any): string => {
      if (!val) return '';
      if (val?.toDate) return val.toDate().toLocaleString('es-MX');
      if (val instanceof Date) return val.toLocaleString('es-MX');
      return String(val);
    };

    const planKey = resolvePlanKey(cong);

    // 3. Crear workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = 'OMP Admin Portal';
    wb.created = new Date();

    // ── Hoja 1: Congregación ──
    const sheetCong = wb.addWorksheet('Congregación', {
      views: [{ showGridLines: true }],
    });
    sheetCong.columns = [
      { header: 'Campo', key: 'campo', width: 28 },
      { header: 'Valor', key: 'valor', width: 48 },
    ];
    // Estilo encabezados
    sheetCong.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    sheetCong.getRow(1).height = 22;

    const congRows = [
      { campo: 'ID', valor: congregationId },
      { campo: 'Nombre', valor: cong.name || '' },
      { campo: 'Clave (nameKey)', valor: cong.nameKey || '' },
      { campo: 'Dominio', valor: cong.domain || '' },
      { campo: 'Correo admin principal', valor: cong.domain ? `admin@${cong.domain}` : '' },
      { campo: 'Circuito', valor: cong.circuit || '' },
      { campo: 'Ciudad', valor: cong.city || '' },
      { campo: 'Estado', valor: cong.state || '' },
      { campo: 'País', valor: cong.country || '' },
      { campo: 'Plan OMP', valor: `${PLAN_LABELS[planKey]} (hasta ${PLAN_USER_LIMITS[planKey]} usuarios)` },
      { campo: 'Precio del plan', valor: `$${PLAN_PRICES_MXN[planKey]} MXN/mes` },
      { campo: 'Estado', valor: cong.isActive !== false ? 'Activo' : 'Inactivo' },
      { campo: 'Total usuarios', valor: String(users.filter((u: any) => !u.isSystemUser).length) },
      { campo: 'Usuarios activos', valor: String(users.filter((u: any) => u.isActive !== false && !u.isSystemUser).length) },
      { campo: 'Usuarios inactivos', valor: String(users.filter((u: any) => u.isActive === false && !u.isSystemUser).length) },
      { campo: 'Creado por', valor: cong.createdBy || cong.updatedBy || '' },
      { campo: 'Actualizado por', valor: cong.updatedBy || cong.createdBy || '' },
      { campo: 'Fecha de creación', valor: fmt(cong.createdAt) },
      { campo: 'Última actualización', valor: fmt(cong.updatedAt) },
    ];
    congRows.forEach((row, idx) => {
      sheetCong.addRow(row);
      const r = sheetCong.getRow(idx + 2);
      r.eachCell(cell => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
      if (idx % 2 === 1) {
        r.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
        });
      }
    });

    // ── Hoja 2: Usuarios ──
    const sheetUsers = wb.addWorksheet('Usuarios', {
      views: [{ showGridLines: true }],
    });
    sheetUsers.columns = [
      { header: 'UID', key: 'uid', width: 30 },
      { header: 'Nombre completo', key: 'displayName', width: 30 },
      { header: 'Nombre', key: 'firstName', width: 20 },
      { header: 'Apellido paterno', key: 'lastName', width: 20 },
      { header: 'Apellido materno', key: 'secondLastName', width: 22 },
      { header: 'Correo electrónico', key: 'email', width: 34 },
      { header: 'Rol', key: 'role', width: 16 },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Contraseña temporal', key: 'passwordIsTemporary', width: 22 },
      { header: 'Teléfono', key: 'phone', width: 18 },
      { header: 'Género', key: 'gender', width: 14 },
      { header: 'Dominio congregación', key: 'congregationDomain', width: 28 },
      { header: 'Creado por', key: 'createdBy', width: 34 },
      { header: 'Actualizado por', key: 'updatedBy', width: 34 },
      { header: 'Fecha de creación', key: 'createdAt', width: 24 },
      { header: 'Última actualización', key: 'updatedAt', width: 24 },
    ];
    // Estilo encabezados
    sheetUsers.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    sheetUsers.getRow(1).height = 22;

    users.forEach((u, idx) => {
      // Fallback para createdBy/updatedBy: campo real → 'Sistema' si fue creado automáticamente
      const createdByVal = u.createdBy || u.updatedBy || 'Sistema';
      const updatedByVal = u.updatedBy || u.createdBy || 'Sistema';

      // Normalizar género
      const genderMap: Record<string, string> = {
        male: 'Masculino', female: 'Femenino',
        masculino: 'Masculino', femenino: 'Femenino',
        M: 'Masculino', F: 'Femenino',
        hombre: 'Masculino', mujer: 'Femenino',
      };
      const genderRaw = u.gender || u.sexo || '';
      const genderVal = genderMap[genderRaw] || genderRaw;

      sheetUsers.addRow({
        uid: u.uid || '',
        displayName: u.displayName || u.name || [u.firstName, u.lastName, u.secondLastName].filter(Boolean).join(' ') || '',
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        secondLastName: u.secondLastName || '',
        email: u.email || '',
        role: u.role || '',
        status: u.isActive !== false ? 'Activo' : 'Inactivo',
        passwordIsTemporary: u.passwordIsTemporary ? 'Sí' : 'No',
        phone: u.phone || u.phoneNumber || u.telefono || '',
        gender: genderVal,
        congregationDomain: u.congregationDomain || cong.domain || '',
        createdBy: createdByVal,
        updatedBy: updatedByVal,
        createdAt: fmt(u.createdAt),
        updatedAt: fmt(u.updatedAt),
      });
      const r = sheetUsers.getRow(idx + 2);
      r.eachCell(cell => {
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
      if (idx % 2 === 1) {
        r.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
        });
      }
    });

    // Freeze header row in both sheets
    sheetCong.views = [{ state: 'frozen', ySplit: 1 }];
    sheetUsers.views = [{ state: 'frozen', ySplit: 1 }];

    // 4. Enviar como descarga
    const safeName = (cong.name || congregationId).replace(/[^a-z0-9áéíóúüñ_\- ]/gi, '_');
    const fileName = `congregacion_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Error exportando congregación:', error);
    res.status(500).json({ error: error.message || 'Error exportando congregación.' });
  }
});

// ─── Helpers para eliminación en cascada ──────────────────────────────────────

/** Cuenta una query sin traer documentos completos — para el modo `?dryRun=true`. */
async function countQuery(query: FirebaseFirestore.Query): Promise<number> {
  const snap = await query.count().get();
  return snap.data().count;
}

/**
 * Cuenta recursivamente una colección y sus subcolecciones sin borrar nada.
 * Necesita traer los documentos (no solo `.count()`) porque `listCollections()`
 * requiere una referencia de documento concreta — es el mismo costo que ya
 * paga `deleteCollectionRecursive`, solo que aquí no se borra.
 */
async function countCollectionRecursive(colRef: FirebaseFirestore.CollectionReference): Promise<number> {
  const snapshot = await colRef.get();
  const total = snapshot.size;
  const subTotals = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const subCols = await doc.ref.listCollections();
      const counts = await Promise.all(subCols.map((subCol) => countCollectionRecursive(subCol)));
      return counts.reduce((a, b) => a + b, 0);
    })
  );
  return total + subTotals.reduce((a, b) => a + b, 0);
}

/** Elimina todos los documentos de una query en lotes de 450 */
async function deleteQueryInBatches(
  query: FirebaseFirestore.Query,
  firestoreDb: FirebaseFirestore.Firestore
): Promise<number> {
  let totalDeleted = 0;
  let snapshot = await query.limit(450).get();

  while (!snapshot.empty) {
    const batch = firestoreDb.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
    if (snapshot.size < 450) break;
    snapshot = await query.limit(450).get();
  }
  return totalDeleted;
}

/**
 * Elimina recursivamente todos los documentos de una colección y sus subcolecciones
 * usando batches de 450 documentos para escalar con grandes volúmenes de datos.
 */
async function deleteCollectionRecursive(
  colRef: FirebaseFirestore.CollectionReference,
  firestoreDb: FirebaseFirestore.Firestore
): Promise<number> {
  let totalDeleted = 0;
  let snapshot = await colRef.limit(450).get();

  while (!snapshot.empty) {
    // Para cada documento, eliminar sus subcolecciones en paralelo primero
    await Promise.all(
      snapshot.docs.map(async (doc) => {
        const subCols = await doc.ref.listCollections();
        if (subCols.length > 0) {
          await Promise.all(
            subCols.map(subCol => deleteCollectionRecursive(subCol, firestoreDb))
          );
        }
      })
    );

    // Eliminar este lote de documentos en un solo batch
    const batch = firestoreDb.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < 450) break;
    // Los docs anteriores ya fueron borrados, obtener el siguiente lote
    snapshot = await colRef.limit(450).get();
  }
  return totalDeleted;
}

// DELETE /api/congregations/:id  — Eliminación total en cascada
// ?dryRun=true devuelve el summary sin borrar ni cancelar nada.
router.delete('/:id', requireOwner, async (req, res) => {
  if (!db || !adminAuth) {
    return res.status(500).json({ error: 'Firebase Admin no configurado.' });
  }

  const congregationId = req.params.id as string;
  const dryRun = req.query.dryRun === 'true';
  const summary: Record<string, number> = {};
  let stripeSubscriptionId: string | null;

  try {
    // 1. Verificar que existe
    const congDoc = await db.collection('congregations').doc(congregationId).get();
    if (!congDoc.exists) {
      return res.status(404).json({ error: 'Congregación no encontrada.' });
    }
    const congData = congDoc.data()!;
    const congName = congData.name || congregationId;

    // 2. Confirmación explícita del nombre — obligatoria incluso en dry-run,
    // para que el preview refleje exactamente lo que borraría el request real.
    const body = parseOrRespond(deleteCongregationBodySchema, req.body, res);
    if (!body) return;
    if (body.confirmName.trim() !== String(congName).trim()) {
      return res.status(400).json({ error: `El nombre no coincide. Escribe exactamente "${congName}" para confirmar.` });
    }

    // 3. Suscripción de Stripe viva: cancelar antes de borrar, o abortar.
    stripeSubscriptionId = (congData.billing?.stripeSubscriptionId as string | undefined) ?? null;
    if (stripeSubscriptionId && !dryRun) {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(409).json({
          error: 'Hay una suscripción de Stripe activa y STRIPE_SECRET_KEY no está configurada. No se puede borrar dejando un cobro vivo.',
        });
      }
      try {
        await stripe.subscriptions.cancel(stripeSubscriptionId);
      } catch (stripeError) {
        console.error('Error cancelando suscripción de Stripe:', stripeError);
        return res.status(409).json({
          error: 'No se pudo cancelar la suscripción de Stripe. Resuelve la facturación antes de borrar la congregación.',
        });
      }
    }

    if (dryRun) {
      const usersCount = await countQuery(db.collection('users').where('congregationId', '==', congregationId));
      summary.users = usersCount;
      summary.rootNotifications = await countQuery(db.collection('notifications').where('congregationId', '==', congregationId));
      summary.events = await countQuery(db.collection('events').where('congregationId', '==', congregationId));
      summary.rootCleaningGroups = await countQuery(db.collection('cleaningGroups').where('congregationId', '==', congregationId));
      summary.rootCleaningGroupsLegacy = await countQuery(db.collection('cleaning_groups').where('congregationId', '==', congregationId));
      const dashDoc = await db.collection('dashboardSummary').doc(congregationId).get();
      summary.dashboardSummary = dashDoc.exists ? 1 : 0;
      const subCollections = await db.collection('congregations').doc(congregationId).listCollections();
      summary.subCollections = subCollections.length;
      const subCounts = await Promise.all(subCollections.map((subCol) => countCollectionRecursive(subCol)));
      summary.subDocumentsDeleted = subCounts.reduce((a, b) => a + b, 0);

      return res.json({ success: true, dryRun: true, congregationId, congregationName: congName, stripeSubscriptionId, summary });
    }

    // 4. Snapshot forense ANTES de borrar nada — no es un backup completo,
    // pero deja rastro de qué existía y quién lo borró. PITR (7 días) es el
    // último recurso real de recuperación (ver README).
    await db.collection('deletedCongregations').doc(congregationId).set({
      congregationId,
      congregationName: congName,
      snapshot: congData,
      deletedBy: req.userEmail ?? 'superadmin',
      deletedAt: FieldValue.serverTimestamp(),
    });

    // 5. Obtener todos los usuarios de la congregación
    const usersSnap = await db.collection('users')
      .where('congregationId', '==', congregationId)
      .get();
    summary.users = usersSnap.size;

    // 6. Eliminar usuarios: Auth + pushTokens (subcolección) + documento Firestore
    const userDeletions = usersSnap.docs.map(async (userDoc) => {
      const uid = userDoc.data().uid || userDoc.id;

      // 3a. Eliminar de Firebase Auth (ignorar si ya no existe)
      try { await adminAuth!.deleteUser(uid); } catch (_) {}

      // 3b. Eliminar subcolección pushTokens/{tokenDocId}
      try {
        const pushTokensCol = userDoc.ref.collection('pushTokens');
        const pushSnap = await pushTokensCol.get();
        if (!pushSnap.empty) {
          const batch = db!.batch();
          pushSnap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          summary.pushTokens = (summary.pushTokens || 0) + pushSnap.size;
        }
      } catch (_) {}

      // 3c. Eliminar documento de Firestore del usuario
      await userDoc.ref.delete();
    });
    await Promise.all(userDeletions);

    // 4. Eliminar notificaciones raíz con congregationId
    summary.rootNotifications = await deleteQueryInBatches(
      db.collection('notifications').where('congregationId', '==', congregationId),
      db
    );

    // 5. Eliminar eventos raíz con congregationId
    summary.events = await deleteQueryInBatches(
      db.collection('events').where('congregationId', '==', congregationId),
      db
    );

    // 6. Eliminar cleaningGroups raíz (por congregationId)
    summary.rootCleaningGroups = await deleteQueryInBatches(
      db.collection('cleaningGroups').where('congregationId', '==', congregationId),
      db
    );

    // 7. Eliminar cleaning_groups raíz legacy (por congregationId)
    summary.rootCleaningGroupsLegacy = await deleteQueryInBatches(
      db.collection('cleaning_groups').where('congregationId', '==', congregationId),
      db
    );

    // 8. Eliminar dashboardSummary/{congregationId}
    const dashRef = db.collection('dashboardSummary').doc(congregationId);
    const dashDoc = await dashRef.get();
    if (dashDoc.exists) {
      await dashRef.delete();
      summary.dashboardSummary = 1;
    }

    // 9. Eliminar TODAS las subcolecciones del documento de la congregación de forma recursiva:
    //    /private, /persons, /meetings (con /assignments), /assignments,
    //    /outgoingTalks, /cleaningGroups, /cleaning_groups,
    //    /notifications, /preachingReports (con /submissions), /changeLogs
    //    y cualquier otra subcolección presente o futura.
    const congRef = db.collection('congregations').doc(congregationId);
    const subCollections = await congRef.listCollections();
    summary.subCollections = subCollections.length;

    const subColResults = await Promise.all(
      subCollections.map(subCol => deleteCollectionRecursive(subCol, db!))
    );
    summary.subDocumentsDeleted = subColResults.reduce((a, b) => a + b, 0);

    // 10. Finalmente eliminar el documento raíz de la congregación
    await congRef.delete();

    console.warn(
      `✅ Congregación "${congName}" (${congregationId}) eliminada completamente. Resumen:`,
      summary
    );

    res.json({
      success: true,
      congregationId,
      congregationName: congName,
      stripeSubscriptionCanceled: stripeSubscriptionId,
      summary,
    });

  } catch (error: any) {
    console.error(`❌ Error eliminando congregación ${congregationId}:`, error);
    res.status(500).json({ error: error.message || 'Error al eliminar la congregación.' });
  }
});

export default router;
