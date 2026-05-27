import { Router } from 'express';
import { requireIapAuth } from '../middleware/requireIapAuth';
import { db } from '../firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const router = Router();

// GET /api/announcements
router.get('/', requireIapAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    
    // Al ser super admin, obtenemos todos los avisos ordenados por fecha de creación desc
    const snapshot = await db.collection('systemAnnouncements')
      .orderBy('createdAt', 'desc')
      .get();
      
    const announcements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Error obteniendo avisos del sistema.' });
  }
});

// POST /api/announcements
router.post('/', requireIapAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

    const { title, message, type, active, target, showOnce, priority, startsAt, endsAt } = req.body;

    if (!title || !message || !type || !target || !startsAt) {
      return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    const docData = {
      title,
      message,
      type,
      active: !!active,
      target,
      showOnce: !!showOnce,
      priority: Math.max(0, Math.min(10, Number(priority) || 0)),
      startsAt: Timestamp.fromDate(new Date(startsAt)),
      endsAt: endsAt ? Timestamp.fromDate(new Date(endsAt)) : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: req.userEmail ?? 'superadmin',
    };

    const docRef = await db.collection('systemAnnouncements').add(docData);
    const savedDoc = await docRef.get();

    res.json({ id: savedDoc.id, ...savedDoc.data() });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Error creando aviso del sistema.' });
  }
});

// PATCH /api/announcements/:id
router.patch('/:id', requireIapAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

    const id = req.params.id as string;
    const { title, message, type, active, target, showOnce, priority, startsAt, endsAt } = req.body;

    const docRef = db.collection('systemAnnouncements').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Aviso no encontrado.' });
    }

    const updates: any = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.userEmail ?? 'superadmin',
    };

    if (title !== undefined) updates.title = title;
    if (message !== undefined) updates.message = message;
    if (type !== undefined) updates.type = type;
    if (active !== undefined) updates.active = !!active;
    if (target !== undefined) updates.target = target;
    if (showOnce !== undefined) updates.showOnce = !!showOnce;
    if (priority !== undefined) updates.priority = Math.max(0, Math.min(10, Number(priority) || 0));
    if (startsAt !== undefined) updates.startsAt = Timestamp.fromDate(new Date(startsAt));
    if (endsAt !== undefined) updates.endsAt = endsAt ? Timestamp.fromDate(new Date(endsAt)) : null;

    await docRef.update(updates);
    
    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Error actualizando aviso del sistema.' });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', requireIapAuth, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });

    const id = req.params.id as string;
    await db.collection('systemAnnouncements').doc(id).delete();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Error eliminando aviso del sistema.' });
  }
});

export default router;
