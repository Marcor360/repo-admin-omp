import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { requireOwner } from '../middleware/requireOwner';
import { db } from '../firebaseAdmin';

const router = Router();

/** Máximo de horas que puede estar activo el mantenimiento */
const MAX_MAINTENANCE_HOURS = 5;
const MAX_MAINTENANCE_MS = MAX_MAINTENANCE_HOURS * 60 * 60 * 1000;

// ─── Helpers compartidos ──────────────────────────────────────────────────────

/**
 * Restaura todas las congregaciones a sus estados previos y elimina el
 * documento de mantenimiento. Se usa tanto en la desactivación manual como
 * en la automática por expiración.
 */
async function performDeactivateMaintenance(
  firestoreDb: Firestore,
  byEmail: string,
): Promise<number> {
  const maintenanceRef = firestoreDb.collection('settings').doc('maintenance');
  const maintenanceDoc = await maintenanceRef.get();
  if (!maintenanceDoc.exists) return 0;

  const previousStates: Record<string, boolean> = maintenanceDoc.data()?.previousStates || {};
  const congregationIds = Object.keys(previousStates);

  for (let i = 0; i < congregationIds.length; i += 500) {
    const batch = firestoreDb.batch();
    congregationIds.slice(i, i + 500).forEach(id => {
      const wasActive = previousStates[id];
      const ref = firestoreDb.collection('congregations').doc(id);
      const updateData: Record<string, unknown> = {
        isActive: wasActive,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: byEmail,
      };
      if (wasActive) {
        updateData.deactivationReason = FieldValue.delete();
      }
      batch.update(ref, updateData);
    });
    await batch.commit();
  }

  await maintenanceRef.delete();
  return congregationIds.length;
}

/**
 * Comprueba si el mantenimiento ha expirado y, si es así, lo desactiva
 * automáticamente. Devuelve true si se desactivó.
 */
export async function checkAndAutoDeactivate(firestoreDb: Firestore): Promise<boolean> {
  try {
    const doc = await firestoreDb.collection('settings').doc('maintenance').get();
    if (!doc.exists || !doc.data()?.active) return false;

    const expiresAt: number = doc.data()?.expiresAt || 0;
    if (Date.now() < expiresAt) return false;

    // Venció — desactivar automáticamente
    await performDeactivateMaintenance(firestoreDb, 'sistema@omp.com (automático)');
    console.warn('Mantenimiento del sistema desactivado automáticamente por vencimiento (5 h).');
    return true;
  } catch (err) {
    console.error('Error en checkAndAutoDeactivate:', err);
    return false;
  }
}

// Vigilante de fondo: revisa cada 60 s si el mantenimiento venció
setInterval(async () => {
  if (db) await checkAndAutoDeactivate(db);
}, 60_000);

// ─── Rutas ────────────────────────────────────────────────────────────────────

// GET /api/system/maintenance — obtener estado del mantenimiento
router.get('/maintenance', requireOwner, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

    // Auto-desactivar si ya venció antes de responder
    await checkAndAutoDeactivate(db);

    const doc = await db.collection('settings').doc('maintenance').get();
    if (!doc.exists || !doc.data()?.active) {
      return res.json({ active: false });
    }

    const data = doc.data()!;
    return res.json({
      active: true,
      activatedAt: data.activatedAt,
      activatedBy: data.activatedBy,
      expiresAt: data.expiresAt,         // timestamp epoch (ms) para el countdown
      maxHours: MAX_MAINTENANCE_HOURS,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estado de mantenimiento' });
  }
});

// POST /api/system/maintenance — activar o desactivar mantenimiento global
router.post('/maintenance', requireOwner, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

    const { active } = req.body;
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active debe ser un booleano' });
    }

    const maintenanceRef = db.collection('settings').doc('maintenance');

    if (active) {
      // ── ACTIVAR MANTENIMIENTO ─────────────────────────────────────────────
      const snapshot = await db.collection('congregations').get();
      const previousStates: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        previousStates[doc.id] = doc.data().isActive !== false;
      });

      const expiresAt = Date.now() + MAX_MAINTENANCE_MS;   // epoch ms

      await maintenanceRef.set({
        active: true,
        activatedAt: FieldValue.serverTimestamp(),
        activatedBy: req.userEmail,
        expiresAt,                                          // número puro para comparar fácilmente
        maxHours: MAX_MAINTENANCE_HOURS,
        previousStates,
      });

      // Desactivar todas las congregaciones en batches
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 500) {
        const batch = db.batch();
        docs.slice(i, i + 500).forEach(doc => {
          batch.update(doc.ref, {
            isActive: false,
            deactivationReason: 'Mantenimiento de sistema',
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: req.userEmail,
          });
        });
        await batch.commit();
      }

      return res.json({
        success: true,
        active: true,
        affected: docs.length,
        expiresAt,
        maxHours: MAX_MAINTENANCE_HOURS,
        message: `Mantenimiento activado por máximo ${MAX_MAINTENANCE_HOURS} horas. ${docs.length} congregación(es) desactivada(s).`,
      });

    } else {
      // ── DESACTIVAR MANTENIMIENTO MANUAL ───────────────────────────────────
      const maintenanceDoc = await maintenanceRef.get();
      if (!maintenanceDoc.exists) {
        return res.status(400).json({ error: 'No hay mantenimiento activo para desactivar.' });
      }

      const restored = await performDeactivateMaintenance(db, req.userEmail || 'sistema@omp.com');

      return res.json({
        success: true,
        active: false,
        restored,
        message: `Mantenimiento desactivado. ${restored} congregación(es) restaurada(s) a su estado anterior.`,
      });
    }

  } catch (error) {
    console.error('Error en mantenimiento:', error);
    res.status(500).json({ error: 'Error gestionando mantenimiento del sistema' });
  }
});

export default router;
