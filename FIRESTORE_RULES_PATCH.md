# Patch recomendado para reglas Firestore

Integra esto dentro de tus reglas actuales. No reemplaza todo tu archivo.

## Función global

Agrega esta función dentro de:

```txt
service cloud.firestore {
  match /databases/{database}/documents {
```

```js
function isSuperAdmin() {
  return request.auth != null
    && exists(/databases/$(database)/documents/superAdmins/$(request.auth.uid))
    && get(/databases/$(database)/documents/superAdmins/$(request.auth.uid)).data.isActive == true;
}
```

## Colección superAdmins

Agrega este bloque:

```js
match /superAdmins/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create, update, delete: if false;
}
```

Esto evita que un cliente web cree o edite superadministradores. El primer superadmin se crea manualmente desde Firebase Console o con Admin SDK.

## Colección congregations

En tu bloque actual de `congregations`, agrega `isSuperAdmin()` a las operaciones administrativas.

Ejemplo base:

```js
match /congregations/{congregationId} {
  allow read: if isSuperAdmin()
    || /* conserva aquí tus permisos actuales de OMP */ false;

  allow create: if isSuperAdmin();

  allow update: if isSuperAdmin()
    || /* conserva aquí tus permisos actuales si existen */ false;

  allow delete: if false;
}
```

Si ya tienes reglas para que admins o supervisores lean su propia congregación, mantenlas. Solo agrega `isSuperAdmin()` como excepción global.

## Colección users

En tu bloque actual de `users`, agrega lectura para superadmin:

```js
match /users/{userId} {
  allow read: if isSuperAdmin()
    || /* conserva aquí tus permisos actuales de OMP */ false;

  // 🛡️ PROTECCIÓN DE USUARIO DEL SISTEMA (@admin)
  // Nadie puede borrar al usuario del sistema (isSystemUser == true), excepto tú (superAdmin)
  allow delete: if isSuperAdmin() 
    || ( 
         /* tus reglas actuales para borrar usuarios, ej: isAdmin() */ false
         && resource.data.isSystemUser != true 
       );

  allow create, update: if /* conserva aquí tus permisos actuales */ false;
}
```

En esta primera versión, el Admin Portal solo lee usuarios. No necesita escribir en `users`.

## Recomendación

Antes de publicar reglas:

1. Copia tus reglas actuales.
2. Agrega `isSuperAdmin()`.
3. Integra los bloques anteriores sin quitar permisos existentes.
4. Prueba en Rules Playground:
   - Usuario sin auth: debe fallar.
   - Usuario normal: no debe leer todo.
   - Admin/supervisor normal: no debe leer todas las congregaciones.
   - Superadmin activo: debe leer congregations y users.
