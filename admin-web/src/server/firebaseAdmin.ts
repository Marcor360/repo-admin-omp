import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let db: FirebaseFirestore.Firestore | null = null;
let adminAuth: Auth | null = null;

try {
  if (!getApps().length) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    const configuredFields = Object.values(serviceAccount).filter(Boolean).length;

    if (configuredFields > 0 && configuredFields < 3) {
      throw new Error(
        'Firebase Admin requiere FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.',
      );
    }

    initializeApp({
      credential: configuredFields === 3
        ? cert(serviceAccount as { projectId: string; clientEmail: string; privateKey: string })
        : applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID
        || process.env.VITE_FIREBASE_PROJECT_ID
        || process.env.GOOGLE_CLOUD_PROJECT,
    });
  }
  db = getFirestore();
  adminAuth = getAuth();
} catch (error) {
  console.error("FIREBASE ADMIN INIT ERROR:", error);
}

export { db, adminAuth };
