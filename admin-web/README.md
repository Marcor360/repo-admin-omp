# OMP Admin Portal

Portal administrativo para el proyecto OMP. Esta herramienta web permite la gestión global de congregaciones (crear, editar, activar, desactivar y asignar liderazgo) asegurando de manera estricta los permisos de acceso y el flujo de los datos.

## Arquitectura

Esta aplicación ha sido refactorizada para utilizar una arquitectura **Full-Stack** segura:
- **Frontend**: React + TypeScript + Vite. Consume una API REST interna, sin acceso directo a Firebase desde el navegador.
- **Backend**: Node.js + Express. Sirve tanto la API (`/api/*`) como los archivos estáticos de React. Interactúa con Firestore mediante **Firebase Admin SDK**, por lo cual bypassa las reglas de seguridad normales garantizando máximo privilegio en el portal.
- **Seguridad y Autenticación**: El acceso al portal **no depende de Firebase Auth ni de roles en Firestore**. Se basa exclusivamente en **Google Cloud Identity-Aware Proxy (IAP)**. Solo los usuarios autorizados explícitamente en el proyecto de Google Cloud con el rol de IAP tienen acceso a la red, y el backend verifica criptográficamente que cada petición proviene de IAP.

## Configuración y Desarrollo Local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno:
   Renombra `.env.example` a `.env.local` y asegúrate de tener tu correo definido como "dueño" para by-passear la validación IAP localmente:
   ```env
   VITE_OWNER_EMAIL=tu_correo@gmail.com
   ```
   *Nota: En desarrollo local, necesitas tener las credenciales de Firebase configuradas a través de Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS`).*

3. Ejecutar en desarrollo:
   ```bash
   npm run dev
   ```
   Esto levantará el backend (Express) en el puerto `3000` y el frontend (Vite) en el puerto `5174`, con un proxy para redirigir `/api` al backend.

## Construcción y Producción Local

1. Compilar frontend y verificar tipos:
   ```bash
   npm run build
   ```

2. Iniciar servidor de producción (sirve el frontend compilado en `dist` y expone `/api`):
   ```bash
   npm run start
   ```

## Despliegue en Cloud Run y Seguridad IAP

La aplicación está diseñada para ser desplegada como un contenedor en Google Cloud Run protegido por un Balanceador de Cargas (HTTPS Load Balancer) y Google Cloud IAP.

1. **Deploy a Cloud Run**:
   ```bash
   gcloud run deploy omp-admin-portal \
     --source . \
     --region us-central1 \
     --allow-unauthenticated
   ```

2. **Asegurar con IAP**:
   - **Nota**: Aunque Cloud Run se configure con `--allow-unauthenticated`, el verdadero muro de seguridad será Identity-Aware Proxy.
   - Crea un **HTTPS Load Balancer** global y dirige el tráfico hacia tu servicio Cloud Run.
   - Ve a `Seguridad > Identity-Aware Proxy` en Google Cloud Console.
   - Activa IAP en el recurso de Backend Service vinculado al Load Balancer.
   - Configura la pantalla de consentimiento OAuth si se te solicita.

3. **Otorgar Permisos de Acceso (IAM)**:
   - Los usuarios (incluyendo al propietario del proyecto) no tienen acceso automáticamente por estar en Firebase Console.
   - Para dar acceso a un administrador a este portal, agrégalo desde Google Cloud IAM o la interfaz de IAP y otórgale el rol:
     **`IAP-secured Web App User`** (`roles/iap.httpsResourceAccessor`).

Cualquier petición sin una aserción válida JWT (`X-Goog-Iap-Jwt-Assertion`) en los headers será rechazada por el backend con un error 401/403.
