import { Router } from 'express';
import { Notification } from '../models';
import { authRequired } from '../middleware/auth';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  const rows = await Notification.find({
    companyId: req.user!.companyId,
    $or: [{ userId: req.user!.id }, { roles: req.user!.role }, { roles: { $size: 0 } }],
  })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(rows);
});

router.post('/:id/read', authRequired, async (req, res) => {
  const row = await Notification.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { readBy: req.user!.id } },
    { new: true }
  );
  res.json(row);
});

export default router;
