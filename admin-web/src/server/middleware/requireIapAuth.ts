import { Request, Response, NextFunction } from 'express';
import { verifyIapToken } from '../iapAuth';

declare global {
  namespace Express {
    interface Request {
      userEmail?: string;
    }
  }
}

export const requireIapAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev && process.env.VITE_OWNER_EMAIL) {
    req.userEmail = process.env.VITE_OWNER_EMAIL;
    return next();
  }

  const iapJwt = req.headers['x-goog-iap-jwt-assertion'] as string;

  if (!iapJwt) {
    res.status(401).json({ error: 'Falta cabecera IAP JWT. Acceso denegado.' });
    return;
  }

  try {
    const email = await verifyIapToken(iapJwt);
    req.userEmail = email;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token IAP inválido.' });
  }
};
