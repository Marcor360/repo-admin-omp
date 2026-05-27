import { Router } from 'express';
import { requireIapAuth } from '../middleware/requireIapAuth';

const router = Router();

router.get('/', requireIapAuth, (req, res) => {
  res.json({
    email: req.userEmail,
    authenticated: true
  });
});

export default router;
