import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import { authRequired, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authRequired, requireRoles('ADMIN', 'DIRECTOR'), async (req, res) => {
  const users = await User.find({ companyId: req.user!.companyId }).select('-passwordHash').sort({ role: 1 });
  res.json(users);
});

router.post('/', authRequired, requireRoles('ADMIN', 'DIRECTOR'), async (req, res) => {
  const { name, email, password, role, phone, projectIds } = req.body;
  const passwordHash = await bcrypt.hash(password || 'Luxaria@123', 10);
  const user = await User.create({
    companyId: req.user!.companyId,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    phone,
    projectIds: projectIds || [],
  });
  const safe = user.toObject();
  delete (safe as { passwordHash?: string }).passwordHash;
  res.status(201).json(safe);
});

export default router;
