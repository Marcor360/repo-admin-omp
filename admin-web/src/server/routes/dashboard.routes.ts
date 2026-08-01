import { Router } from 'express';
import { requireOwner } from '../middleware/requireOwner';
import { db } from '../firebaseAdmin';

const router = Router();

router.get('/stats', requireOwner, async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Firebase Admin no configurado.' });
    const [totalCongregations, activeCongregations, activeUsers, inactiveUsers, systemActiveUsers, systemInactiveUsers] = await Promise.all([
      db.collection('congregations').count().get(),
      db.collection('congregations').where('isActive', '==', true).count().get(),
      db.collection('users').where('isActive', '==', true).count().get(),
      db.collection('users').where('isActive', '==', false).count().get(),
      db.collection('users').where('isActive', '==', true).where('isSystemUser', '==', true).count().get(),
      db.collection('users').where('isActive', '==', false).where('isSystemUser', '==', true).count().get(),
    ]);

    const totalC = totalCongregations.data().count;
    const activeC = activeCongregations.data().count;

    res.json({
      totalCongregations: totalC,
      activeCongregations: activeC,
      inactiveCongregations: totalC - activeC,
      activeUsers: activeUsers.data().count - systemActiveUsers.data().count,
      inactiveUsers: inactiveUsers.data().count - systemInactiveUsers.data().count
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
