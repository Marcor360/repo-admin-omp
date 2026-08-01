import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../firebaseAdmin';

export interface AuditLogEntry {
  actor: string;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  if (!db) {
    console.error('writeAuditLog: Firebase Admin no configurado, entrada descartada:', entry);
    return;
  }
  await db.collection('adminAuditLogs').add({
    ...entry,
    createdAt: FieldValue.serverTimestamp(),
  });
}
