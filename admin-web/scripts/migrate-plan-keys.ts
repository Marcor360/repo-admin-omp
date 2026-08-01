import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../src/server/firebaseAdmin';
import { PLAN_USER_LIMITS, type BillingPlanKey } from '../src/shared/contracts/billing';
import { normalizeLegacyPlanKey } from '../src/server/utils/planLegacy';
import { writeAuditLog } from '../src/server/utils/auditLog';

const APPLY = process.argv.includes('--apply');

interface PlannedChange {
  id: string;
  name: string;
  from: string;
  to: BillingPlanKey;
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
    const billing = (data.billing as Record<string, unknown> | undefined) ?? {};

    if (normalizeLegacyPlanKey(billing.planKey)) {
      continue; // ya tiene billing.planKey válido (manual o vía Stripe) — no tocar
    }

    const legacySource = billing.plan ?? data.plan;
    const target = normalizeLegacyPlanKey(legacySource);
    if (!target) continue; // no hay dato legado reconocible que migrar

    changes.push({
      id: doc.id,
      name: String(data.name ?? doc.id),
      from: String(legacySource),
      to: target,
    });
  }

  console.log(`Congregaciones evaluadas: ${snapshot.size}`);
  console.log(`Congregaciones a migrar: ${changes.length}\n`);
  changes.forEach((c) => console.log(`  ${c.name} (${c.id}): "${c.from}" -> "${c.to}"`));

  if (!APPLY) {
    console.log('\nDry-run (por defecto). No se escribió nada. Usa --apply para aplicar los cambios.');
    return;
  }

  for (const change of changes) {
    const ref = db.collection('congregations').doc(change.id);
    const limit = PLAN_USER_LIMITS[change.to];

    await ref.update({
      'billing.planKey': change.to,
      'billing.activeUsersLimit': limit,
      'billing.userLimit': limit,
      plan: FieldValue.delete(),
      'billing.plan': FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actor: 'scripts/migrate-plan-keys.ts',
      action: 'migrate_plan_key',
      target: change.id,
      metadata: { congregationName: change.name, from: change.from, to: change.to },
    });
  }

  console.log(`\nMigración aplicada a ${changes.length} congregación(es). Cada cambio quedó en adminAuditLogs.`);
}

main().catch((error) => {
  console.error('Error en la migración de planes:', error);
  process.exit(1);
});
