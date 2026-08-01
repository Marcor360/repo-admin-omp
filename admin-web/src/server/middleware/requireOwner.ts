import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../firebaseAdmin';

function parseOwnerAllowlist(): string[] {
  return (process.env.OWNER_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const requireOwner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ code: 'NO_TOKEN', error: 'Falta el token de autenticación.' });
    return;
  }

  if (!adminAuth) {
    res.status(500).json({ code: 'OWNER_ALLOWLIST_MISSING', error: 'Firebase Admin no configurado.' });
    return;
  }

  const ownerEmails = parseOwnerAllowlist();
  if (ownerEmails.length === 0) {
    console.error('OWNER_EMAILS no está configurado. Denegando todas las solicitudes por seguridad.');
    res.status(500).json({
      code: 'OWNER_ALLOWLIST_MISSING',
      error: 'El servidor no tiene configurada la lista de propietarios.',
    });
    return;
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth.verifyIdToken(token, true);
  } catch (error) {
    res.status(401).json({ code: 'INVALID_TOKEN', error: 'Token inválido o revocado.' });
    return;
  }

  const email = decoded.email?.toLowerCase().trim();
  const emailVerified = decoded.email_verified === true;
  const signInProvider = decoded.firebase?.sign_in_provider;

  if (!email || !emailVerified || signInProvider !== 'google.com') {
    console.warn(`Acceso rechazado (credenciales insuficientes): email=${email ?? 'desconocido'} ip=${req.ip}`);
    res.status(403).json({ code: 'NOT_OWNER', error: 'Esta cuenta no tiene acceso al panel.' });
    return;
  }

  if (!ownerEmails.includes(email)) {
    console.warn(`Intento de acceso no autorizado al panel: email=${email} ip=${req.ip}`);
    res.status(403).json({ code: 'NOT_OWNER', error: 'Esta cuenta no tiene acceso al panel.' });
    return;
  }

  if (decoded.superAdmin !== true) {
    try {
      await adminAuth.setCustomUserClaims(decoded.uid, { superAdmin: true });
    } catch (error) {
      console.error('Error asignando el claim superAdmin:', error);
      res.status(500).json({ code: 'CLAIM_GRANT_FAILED', error: 'No se pudo asignar el rol de propietario.' });
      return;
    }
    res.status(401).json({ code: 'CLAIM_GRANTED', error: 'Rol de propietario asignado. Vuelve a intentarlo.' });
    return;
  }

  req.owner = { uid: decoded.uid, email };
  req.userEmail = email;
  next();
};
