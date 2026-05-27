# OMP Admin Portal

Herramienta web separada para administrar congregaciones de OMP.

## Qué incluye

- React + TypeScript + Vite.
- Firebase Authentication.
- Firestore con Firebase Web SDK modular.
- Protección por colección `superAdmins/{uid}`.
- Dashboard global.
- CRUD básico de congregaciones: crear, editar, activar y desactivar.
- Vista de usuarios por congregación.
- Estadísticas por congregación usando `getCountFromServer`.
- Asignación de secretario y coordinador por UID, sin modificar roles existentes.

## Qué no incluye

- No modifica la app principal OMP.
- No incluye React Native ni Expo.
- No edita usuarios.
- No borra congregaciones permanentemente.
- No administra reuniones, asignaciones, limpieza ni hospitalidad.

## Instalación local

```bash
cd admin-web
npm install
cp .env.example .env.local
npm run dev
```

Luego abre:

```txt
http://localhost:5174
```

## Variables de entorno

Crea `admin-web/.env.local` con los datos de tu app web de Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx
```

## Crear el primer superadministrador

1. Crea o usa un usuario existente en Firebase Authentication.
2. Copia su UID.
3. En Firestore crea:

```txt
superAdmins/{UID_DEL_USUARIO}
```

Con estos campos:

```json
{
  "email": "tu-correo@email.com",
  "isActive": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Desde Firebase Console no existe `serverTimestamp` como valor literal; puedes poner fecha manual o dejar esos campos fuera. Lo importante para el acceso es `isActive: true`.

## Reglas de Firestore

No reemplaces tus reglas actuales a ciegas. Integra el archivo:

```txt
FIRESTORE_RULES_PATCH.md
```

Ese archivo trae las funciones y bloques que debes fusionar con tus reglas existentes.

## Build

```bash
cd admin-web
npm run build
```

El build queda en:

```txt
admin-web/dist
```

## Despliegue sugerido en Firebase Hosting

Puedes desplegarlo como sitio separado dentro del mismo proyecto Firebase.

Ejemplo de `firebase.json` si este portal será hosting separado:

```json
{
  "hosting": {
    "public": "admin-web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

Si ya tienes hosting para OMP principal, usa un target diferente de Firebase Hosting para no mezclar ambas apps.
