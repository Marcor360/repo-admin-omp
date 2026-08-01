import { signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase';

interface ApiErrorBody {
  code?: string;
  error?: string;
}

async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    return (await response.clone().json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

/**
 * Reemplazo directo de `fetch` para llamadas a `/api/*`: adjunta el ID token
 * de Firebase del propietario y resuelve los dos códigos que devuelve
 * `requireOwner` en el servidor.
 */
export async function apiFetch(input: string, init: RequestInit = {}, isRetry = false): Promise<Response> {
  const user = auth.currentUser;
  const headers = new Headers(init.headers);
  if (user) {
    headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 && !isRetry && user) {
    const body = await readErrorBody(response);
    if (body?.code === 'CLAIM_GRANTED') {
      await user.getIdToken(true);
      return apiFetch(input, init, true);
    }
  }

  if (response.status === 403) {
    const body = await readErrorBody(response);
    if (body?.code === 'NOT_OWNER') {
      await signOut(auth);
      window.location.href = '/not-authorized';
    }
  }

  return response;
}
