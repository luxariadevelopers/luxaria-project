import { Router } from 'express';
import { Account, LedgerEntry } from '../models';
import { authRequired, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId, isActive: true };
  if (req.query.type) filter.type = req.query.type;
  const accounts = await Account.find(filter).populate('holderUserId', 'name').sort({ type: 1, name: 1 });
  res.json(accounts);
});

router.post('/', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'FINANCE'), async (req, res) => {
  const account = await Account.create({
    companyId: req.user!.companyId,
    projectId: req.body.projectId,
    name: req.body.name,
    type: req.body.type,
    bankName: req.body.bankName,
    accountNumberMasked: req.body.accountNumberMasked,
    holderUserId: req.body.holderUserId,
    balancePaise: 0,
  });
  res.status(201).json(account);
});

router.get('/ledger', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.accountId) {
    filter.$or = [{ debitAccountId: req.query.accountId }, { creditAccountId: req.query.accountId }];
  }
  const entries = await LedgerEntry.find(filter)
    .populate('debitAccountId', 'name type')
    .populate('creditAccountId', 'name type')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json(entries);
});

export default router;
