import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import { authRequired, signAccessToken } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const payload = {
    id: user._id.toString(),
    companyId: user.companyId.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
    projectIds: user.projectIds.map((p) => p.toString()),
  };
  const token = signAccessToken(payload);
  res.json({ token, user: payload });
});

router.get('/me', authRequired, async (req, res) => {
  const user = await User.findById(req.user!.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

export default router;
