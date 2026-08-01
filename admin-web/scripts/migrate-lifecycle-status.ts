import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../src/server/firebaseAdmin';
import { writeAuditLog } from '../src/server/utils/auditLog';
import { isLifecycleStatus, type LifecycleStatus } from '../src/server/domain/lifecycle';

const APPLY = process.argv.includes('--apply');

interface PlannedChange {
  id: string;
  name: string;
  isActive: boolean;
  to: LifecycleStatus;
}

async function main(): Promise<void> {
  if (!db) {
    console.error('Firebase Admin no configurado (revisa FIREBASE_* / ADC).');
    process.exit(1);
  }

  const snapshot = await db.collection('congregations').get();
  const changes: PlannedChange[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (isLifecycleStatus(data.lifecycleStatus)) continue; // ya migrada

    const isActive = data.isActive !== undefined ? data.isActive : (data.active !== undefined ? data.active : true);
    changes.push({
      id: doc.id,
      name: String(data.name ?? doc.id),
      isActive,
      to: isActive ? 'active' : 'paused',
    });
  }

  console.log(`Congregaciones evaluadas: ${snapshot.size}`);
  console.log(`Congregaciones a migrar: ${changes.length}\n`);
  changes.forEach((c) => console.log(`  ${c.name} (${c.id}): isActive=${c.isActive} -> lifecycleStatus="${c.to}"`));

  if (!APPLY) {
    console.log('\nDry-run (por defecto). No se escribió nada. Usa --apply para aplicar los cambios.');
    return;
  }

  for (const change of changes) {
    const ref = db.collection('congregations').doc(change.id);
    const doc = await ref.get();
    const data = doc.data() ?? {};

    await ref.update({
      lifecycleStatus: change.to,
      isActive: change.to === 'active',
      // El deactivationReason existente (si lo había) pasa a ser el pauseReason.
      ...(change.to === 'paused' ? { pauseReason: data.deactivationReason || 'Pausa manual (migrada)' } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actor: 'scripts/migrate-lifecycle-status.ts',
      action: 'migrate_lifecycle_status',
      target: change.id,
      metadata: { congregationName: change.name, isActive: change.isActive, to: change.to },
    });
  }

  console.log(`\nMigración aplicada a ${changes.length} congregación(es). Cada cambio quedó en adminAuditLogs.`);
}

main().catch((error) => {
  console.error('Error en la migración de lifecycle:', error);
  process.exit(1);
});
