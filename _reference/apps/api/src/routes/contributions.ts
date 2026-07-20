import { Router } from 'express';
import { Contribution, Account } from '../models';
import { authRequired, requireRoles } from '../middleware/auth';
import { postLedger, withTransaction, createOne, sessionOpt } from '../services/ledger';
import { emitCompany, emitProject } from '../services/realtime';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.user!.role === 'INVESTOR') filter.investorUserId = req.user!.id;
  const rows = await Contribution.find(filter)
    .populate('investorUserId', 'name email role')
    .populate('accountId', 'name type')
    .sort({ date: -1 });
  res.json(rows);
});

router.get('/summary', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.user!.role === 'INVESTOR') filter.investorUserId = req.user!.id;
  const rows = await Contribution.find(filter);
  const cashPaise = rows.filter((r) => r.mode === 'cash').reduce((s, r) => s + r.amountPaise, 0);
  const bankPaise = rows.filter((r) => r.mode === 'bank').reduce((s, r) => s + r.amountPaise, 0);
  res.json({ cashPaise, bankPaise, totalPaise: cashPaise + bankPaise, count: rows.length });
});

router.post('/', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'FINANCE'), async (req, res) => {
  const {
    projectId,
    investorUserId,
    investorType,
    amountPaise,
    mode,
    accountId,
    profitSharePercent,
    date,
    notes,
  } = req.body;

  if (!projectId || !investorUserId || !amountPaise || !mode || !accountId || profitSharePercent == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const equityAccount = await Account.findOne({
    companyId: req.user!.companyId,
    name: 'Director Capital / Equity',
  });
  if (!equityAccount) return res.status(400).json({ error: 'Equity account missing — run seed' });

  try {
    const contrib = await withTransaction(async (session) => {
      const row = await createOne<any>(Contribution, {
            companyId: req.user!.companyId,
            projectId,
            investorUserId,
            investorType: investorType || 'DIRECTOR',
            amountPaise,
            mode,
            accountId,
            profitSharePercent,
            date: date ? new Date(date) : new Date(),
            notes,
            createdBy: req.user!.id,
          }, session);

      // Money comes into bank/cash (debit asset), equity credited conceptually via contra:
      // Debit receiving account (increases asset balance in our simplified model)
      // Credit equity account
      await postLedger({
        companyId: req.user!.companyId,
        projectId,
        debitAccountId: accountId,
        creditAccountId: equityAccount._id,
        amountPaise,
        narration: `Investment ${mode} — contribution`,
        refType: 'CONTRIBUTION',
        refId: row._id,
        createdBy: req.user!.id,
        session,
      });

      return row;
    });

    emitCompany(req.user!.companyId, 'contribution:created', contrib);
    emitProject(projectId, 'contribution:created', contrib);
    res.status(201).json(contrib);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;
