import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();

export async function verifyIapToken(iapJwt: string): Promise<string> {
  try {
    const ticket = await client.verifyIdToken({
      idToken: iapJwt,
      // En un entorno de producción estricto, deberíamos validar también el audience
      // audience: expectedAudience 
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Invalid JWT payload from IAP');
    }
    
    // IAP a veces devuelve el email con prefijo 'accounts.google.com:'
    let email = payload.email;
    if (email.startsWith('accounts.google.com:')) {
      email = email.split(':')[1];
    }
    
    return email;
  } catch (error) {
    console.error('Error verifying IAP JWT:', error);
    throw error;
  }
}
