# OMP Admin Portal

Panel administrativo full-stack de OMP. El frontend usa React, TypeScript y Vite;
el backend usa Express y Firebase Admin SDK. La imagen de producción se despliega
en Cloud Run mediante el `Dockerfile` del proyecto.

## Requisitos

- Node.js 22.22 o posterior.
- npm.
- Un proyecto de Firebase configurado.
- Para producción, una cuenta de servicio de Cloud Run con acceso a Firestore y
  Firebase Authentication.

## Variables de entorno

Copia `.env.example` como `.env.local`. Este archivo es local y está ignorado por
Git.

```powershell
Copy-Item .env.example .env.local
```

Variables del frontend:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Variables del servidor:

- `PORT`: puerto de Express; por defecto `3000`.
- `OWNER_EMAILS`: lista de correos (separados por comas) autorizados a entrar
  al panel. Es la única fuente de autorización real. Si está vacía o ausente,
  el servidor rechaza todas las solicitudes (falla cerrado) — nunca la dejes
  sin definir en Cloud Run.
- `ALLOWED_ORIGIN`: origen exacto permitido por CORS para las rutas
  protegidas. En Cloud Run, con el mismo servicio sirviendo frontend y API,
  puede quedar vacío (las llamadas son same-origin). `GET
  /api/congregations/:id/access-check` es la única ruta pública y no depende
  de esta variable, porque la consume la app móvil desde otro origen.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`:
  credenciales explícitas opcionales para Firebase Admin. La clave privada debe
  representar sus saltos de línea mediante `\n`.
- El resto de las variables `FIREBASE_*` de `.env.example` representa los campos
  restantes de una cuenta de servicio.

No guardes claves privadas ni archivos `serviceAccount*.json` en el repositorio.
En Cloud Run se recomienda usar Application Default Credentials mediante la
identidad del servicio, sin variables de clave privada.

## Desarrollo local

Instala las dependencias:

```bash
npm ci
```

Inicia frontend y backend:

```bash
npm run dev
```

- Frontend: `http://localhost:5174`
- API: `http://localhost:3000/api`

El servidor de Vite redirige las llamadas `/api` al backend local.

## Validación

```bash
npm run validate
npm run build
```

`validate` ejecuta la comprobación de TypeScript y ESLint. El workflow
`.github/workflows/admin-web-validate.yml` ejecuta la misma validación en cada
pull request que modifica `admin-web/`.

## Producción local

```bash
npm run build
npm run start
```

En producción, Express sirve la aplicación compilada desde `dist/` además de la
API.

## Autenticación

El panel no usa Google Cloud IAP: la autenticación es Firebase Auth con
Google Sign-In, restringida a una allowlist de propietarios (`OWNER_EMAILS`)
más un custom claim (`superAdmin`) verificado en cada request por el
middleware `requireOwner`. Un correo en la allowlist sin haber iniciado
sesión con Google no sirve, y un claim sin estar en la allowlist tampoco: se
requieren ambas condiciones. `GET /api/congregations/:id/access-check` sigue
siendo la única ruta pública, para la app móvil.

Configuración única en Firebase Console (no se puede automatizar):

1. **Authentication → Sign-in method** → habilitar el proveedor **Google**.
2. **Authentication → Settings → Authorized domains** → añadir el dominio de
   Cloud Run del servicio (y `localhost` ya viene incluido para desarrollo).

## Despliegue en Cloud Run

Desde `admin-web/`:

```bash
gcloud run deploy omp-admin-portal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OWNER_EMAILS=propietario@example.com
```

`--allow-unauthenticated` es correcto aquí: la autorización real ocurre dentro
de la aplicación (`requireOwner`), no en la capa de infraestructura. Define
`OWNER_EMAILS` como variable de entorno del servicio — sin ella, el servidor
rechaza toda la API con `500 OWNER_ALLOWLIST_MISSING`.

La cuenta de servicio de Cloud Run debe contar, como mínimo, con los permisos
equivalentes a `roles/datastore.user` y `roles/firebaseauth.admin`. Firebase Admin
obtendrá las credenciales mediante ADC.

## Recuperación de acceso

El propietario del proyecto de GCP siempre puede recuperar el acceso sin
depender de ningún secreto guardado:

```bash
gcloud auth application-default login
npm run grant:owner -- tu-correo@gmail.com
```

Esto crea el usuario en Firebase Auth si no existe y le concede el custom
claim `superAdmin`. Después, añade ese correo a `OWNER_EMAILS` en el entorno
del servicio (si no estaba ya) y vuelve a iniciar sesión con Google en el
panel — `requireOwner` fuerza un refresco de token la primera vez que detecta
que falta el claim.

Para revocar el acceso de una cuenta comprometida de inmediato:

```ts
await getAuth().revokeRefreshTokens(uid);
```

(el middleware verifica `checkRevoked: true` en cada request, así que las
sesiones activas mueren de inmediato).

## Seguridad de credenciales

Una clave de cuenta de servicio que haya sido publicada debe revocarse, aunque el
archivo se elimine después. Si llegó a Git remoto, también permanece en el
historial hasta que este se limpie. No reutilices una clave expuesta.
