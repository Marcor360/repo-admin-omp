import { Router } from 'express';
import { requireOwner } from '../middleware/requireOwner';

const router = Router();

router.get('/', requireOwner, (req, res) => {
  res.json({
    email: req.userEmail,
    authenticated: true
  });
});

export default router;
