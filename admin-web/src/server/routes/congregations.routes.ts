import { Router } from 'express';
import ExcelJS from 'exceljs';
import { requireIapAuth } from '../middleware/requireIapAuth';
import { db, adminAuth } from '../firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkAndAutoDeactivate } from './system.routes';

const router = Router();

// GET /api/congregations
router.get('/', requireIapAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado. Falta serviceAccountKey.json o gcloud auth.' });
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
router.get('/:id', requireIapAuth, async (req, res) => {
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
      nameKey: data.nameKey || data.code || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching congregation' });
  }
});

// POST /api/congregations
router.post('/', requireIapAuth, async (req, res) => {
  try {
    if (!db || !adminAuth) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    const { name, city, state, country, circuit, plan = 'basico', isActive = true } = req.body;
    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'Name must be at least 3 characters long' });
    }
    const validPlans = ['basico', 'intermedio', 'completo'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: `Plan inválido. Opciones: ${validPlans.join(', ')}` });
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
      plan,
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
router.patch('/:id', requireIapAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    const { name, city, state, country, circuit, plan } = req.body;
    if (name !== undefined && (!name || name.length < 3)) {
      return res.status(400).json({ error: 'Name must be at least 3 characters long' });
    }
    if (plan !== undefined) {
      const validPlans = ['basico', 'intermedio', 'completo'];
      if (!validPlans.includes(plan)) {
        return res.status(400).json({ error: `Plan inválido. Opciones: ${validPlans.join(', ')}` });
      }
    }

    const updates: any = {
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
    if (plan !== undefined) updates.plan = plan;

    await db.collection('congregations').doc(req.params.id as string).update(updates);
    const doc = await db.collection('congregations').doc(req.params.id as string).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Error updating congregation' });
  }
});

// PATCH /api/congregations/:id/status
router.patch('/:id/status', requireIapAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    const { isActive, reason } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const updateData: Record<string, unknown> = {
      isActive,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.userEmail,
    };

    if (!isActive) {
      // Al desactivar: guardar el motivo
      updateData.deactivationReason = reason || 'Desactivación temporal';
    } else {
      // Al activar: limpiar motivo y marcar como restaurada manualmente
      updateData.deactivationReason = FieldValue.delete();
      updateData.restoredBy = req.userEmail;
      updateData.restoredAt = FieldValue.serverTimestamp();
    }

    await db.collection('congregations').doc(req.params.id as string).update(updateData);

    res.json({ success: true, isActive });
  } catch (error) {
    res.status(500).json({ error: 'Error updating status' });
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
      return res.status(403).json({
        allowed: false,
        congregationId: congregationId,
        congregationName: cong.name || '',
        reason: cong.deactivationReason || 'Desactivación temporal',
        message: `La congregación "${cong.name}" (${congregationId}) está desactivada. Motivo: ${cong.deactivationReason || 'Desactivación temporal'}.`,
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
router.patch('/:id/leadership', requireIapAuth, async (req, res) => {
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

// PATCH /api/congregations/:id/billing
router.patch('/:id/billing', requireIapAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    
    const { 
      billingMode, status, plan, maxUsers, 
      exemptReason, exemptUntil,
      stripeCustomerId, stripeSubscriptionId, stripePriceId
    } = req.body;
    
    if (!billingMode) {
      return res.status(400).json({ error: 'El billingMode es requerido.' });
    }

    const updates: Record<string, any> = {
      'billing.billingMode': billingMode,
      'billing.status': status || 'none',
      'billing.plan': plan || 'none',
      'billing.maxUsers': Number(maxUsers) || 0,
      'billing.updatedAt': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.userEmail
    };

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
router.get('/:id/export', requireIapAuth, async (req, res) => {
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

    const planLabels: Record<string, string> = {
      basico: 'Básico (10 usuarios)',
      intermedio: 'Intermedio (30 usuarios)',
      completo: 'Completo (100 usuarios)',
    };

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
      { campo: 'Plan OMP', valor: planLabels[cong.plan] || cong.plan || '' },
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
router.delete('/:id', requireIapAuth, async (req, res) => {
  if (!db || !adminAuth) {
    return res.status(500).json({ error: 'Firebase Admin no configurado.' });
  }

  const congregationId = req.params.id as string;
  const summary: Record<string, number> = {};

  try {
    // 1. Verificar que existe
    const congDoc = await db.collection('congregations').doc(congregationId).get();
    if (!congDoc.exists) {
      return res.status(404).json({ error: 'Congregación no encontrada.' });
    }
    const congName = (congDoc.data() as any)?.name || congregationId;

    // 2. Obtener todos los usuarios de la congregación
    const usersSnap = await db.collection('users')
      .where('congregationId', '==', congregationId)
      .get();
    summary.users = usersSnap.size;

    // 3. Eliminar usuarios: Auth + pushTokens (subcolección) + documento Firestore
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

    console.log(
      `✅ Congregación "${congName}" (${congregationId}) eliminada completamente. Resumen:`,
      summary
    );

    res.json({
      success: true,
      congregationId,
      congregationName: congName,
      summary,
    });

  } catch (error: any) {
    console.error(`❌ Error eliminando congregación ${congregationId}:`, error);
    res.status(500).json({ error: error.message || 'Error al eliminar la congregación.' });
  }
});

export default router;
