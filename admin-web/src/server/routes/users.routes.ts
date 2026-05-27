import { Router } from 'express';
import { requireIapAuth } from '../middleware/requireIapAuth';
import { db, adminAuth } from '../firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const router = Router({ mergeParams: true });

// GET /api/congregations/:id/users
router.get('/', requireIapAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    const congregationId = req.params.id as string;
    const { status, role } = req.query;

    let query: FirebaseFirestore.Query = db.collection('users').where('congregationId', '==', congregationId);

    if (status === 'active') {
      query = query.where('isActive', '==', true);
    } else if (status === 'inactive') {
      query = query.where('isActive', '==', false);
    }

    if (role) {
      query = query.where('role', '==', role);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        displayName: data.displayName,
        name: data.name,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        secondLastName: data.secondLastName,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        role: data.role || 'Sin rol',
        isActive: data.isActive ?? true,
        isSystemUser: data.isSystemUser ?? false,
        protectedFromDeletion: data.protectedFromDeletion ?? false,
        isPrimaryAdmin: data.isPrimaryAdmin ?? false,
        isRootAdmin: data.isRootAdmin ?? false,
        systemProtected: data.systemProtected ?? false,
        congregationId: data.congregationId,
        congregationDomain: data.congregationDomain,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      };
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// PATCH /api/congregations/:id/users/:userId
router.patch('/:userId', requireIapAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

    const congregationId = req.params.id as string;
    const userId = req.params.userId as string;

    // Verificar que el usuario existe y pertenece a la congregación
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const currentData = userDoc.data() as any;
    if (currentData.congregationId !== congregationId) {
      return res.status(403).json({ error: 'El usuario no pertenece a esta congregación.' });
    }

    // Validar campos requeridos
    const { firstName, middleName, lastName, secondLastName, phone, gender, role, isActive } = req.body;

    if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre es requerido.' });
    }
    if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
      return res.status(400).json({ error: 'El apellido paterno es requerido.' });
    }
    if (!role || !['admin', 'supervisor', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido. Opciones: admin, supervisor, user.' });
    }
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive debe ser un booleano.' });
    }
    if (gender && !['masculino', 'femenino'].includes(gender)) {
      return res.status(400).json({ error: 'Género inválido. Opciones: masculino, femenino.' });
    }

    // Construir displayName automáticamente
    const nameParts = [
      firstName.trim(),
      middleName?.trim(),
      lastName.trim(),
      secondLastName?.trim(),
    ].filter(Boolean);
    const displayName = nameParts.join(' ');

    const updates: Record<string, unknown> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName,
      role,
      isActive,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: (req as any).userEmail ?? 'superadmin',
    };

    if (middleName !== undefined) updates.middleName = middleName?.trim() || null;
    if (secondLastName !== undefined) updates.secondLastName = secondLastName?.trim() || null;
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (gender !== undefined) updates.gender = gender || null;

    await userRef.update(updates);

    const updated = await userRef.get();
    const data = updated.data() as any;

    res.json({
      id: updated.id,
      uid: data.uid,
      displayName: data.displayName,
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      secondLastName: data.secondLastName,
      email: data.email,
      phone: data.phone,
      gender: data.gender,
      role: data.role,
      isActive: data.isActive,
      congregationId: data.congregationId,
      updatedAt: data.updatedAt,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error actualizando usuario.' });
  }
});

// PATCH /api/congregations/:id/users/:userId/password
router.patch('/:userId/password', requireIapAuth, async (req, res) => {
  try {
    if (!db || !adminAuth) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

    const congregationId = req.params.id as string;
    const userId = req.params.userId as string;

    // Verificar que el usuario pertenece a la congregación
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const currentData = userDoc.data() as any;
    if (currentData.congregationId !== congregationId) {
      return res.status(403).json({ error: 'El usuario no pertenece a esta congregación.' });
    }

    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'La contraseña es requerida.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: 'La contraseña no puede superar los 128 caracteres.' });
    }

    // Cambiar contraseña vía Firebase Admin Auth (no requiere la contraseña actual)
    await adminAuth.updateUser(userId, { password });

    // Registrar en Firestore que la contraseña fue cambiada (audit trail)
    await userRef.update({
      passwordIsTemporary: false,
      passwordChangedAt: FieldValue.serverTimestamp(),
      passwordChangedBy: (req as any).userEmail ?? 'superadmin',
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: (req as any).userEmail ?? 'superadmin',
    });

    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error: any) {
    console.error('Error changing password:', error);
    const msg = error?.errorInfo?.message || error?.message || 'Error cambiando contraseña.';
    res.status(500).json({ error: msg });
  }
});

// DELETE /api/congregations/:id/users/:userId
router.delete('/:userId', requireIapAuth, async (req, res) => {
  try {
    if (!db || !adminAuth) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

    const congregationId = req.params.id as string;
    const userId = req.params.userId as string;

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const currentData = userDoc.data() as any;
    if (currentData.congregationId !== congregationId) {
      return res.status(403).json({ error: 'El usuario no pertenece a esta congregación.' });
    }

    // 1. Eliminar de Firebase Auth (si existe)
    try {
      await adminAuth.deleteUser(userId);
    } catch (authErr: any) {
      // Ignorar si el usuario no existe en Auth (auth/user-not-found)
      if (authErr.code !== 'auth/user-not-found') {
        console.error('Error eliminando usuario de Auth:', authErr);
        // Continuamos de todos modos para eliminar el documento en Firestore
      }
    }

    // 2. Eliminar de Firestore
    await userRef.delete();

    res.json({ success: true, message: 'Usuario eliminado correctamente.' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    const msg = error?.message || 'Error eliminando usuario.';
    res.status(500).json({ error: msg });
  }
});

export default router;

