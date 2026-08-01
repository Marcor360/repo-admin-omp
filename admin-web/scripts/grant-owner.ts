import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

async function main(): Promise<void> {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: npm run grant:owner -- correo@dominio.com');
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    });
  }

  const auth = getAuth();

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    console.log(`Usuario existente encontrado: ${email} (${uid})`);
  } catch {
    const created = await auth.createUser({ email, emailVerified: true });
    uid = created.uid;
    console.log(`Usuario creado (sin contraseña, inicia sesión con Google): ${email} (${uid})`);
  }

  await auth.setCustomUserClaims(uid, { superAdmin: true });

  console.log(`\nClaim "superAdmin" concedido a ${email}.`);
  console.log('Pasos restantes:');
  console.log(`  1. Asegúrate de que OWNER_EMAILS incluya "${email}" en el entorno del servidor.`);
  console.log('  2. Pide a esa persona cerrar sesión y volver a entrar con Google en el panel.');
}

main().catch((error) => {
  console.error('Error al conceder el rol de propietario:', error);
  process.exit(1);
});
