import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let db: FirebaseFirestore.Firestore | null = null;
let adminAuth: any = null;

try {
  if (!getApps().length) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    });
  }
  db = getFirestore();
  adminAuth = getAuth();
} catch (error) {
  console.error("FIREBASE ADMIN INIT ERROR:", error);
}

export { db, adminAuth };
