import { Router } from 'express';
import {
  Expense,
  PettyCashFloat,
  PettyCashRequest,
  Voucher,
  Account,
} from '../models';
import { authRequired, requireRoles } from '../middleware/auth';
import { postLedger, withTransaction, createOne, sessionOpt } from '../services/ledger';
import { emitCompany, emitProject } from '../services/realtime';
import { notify } from '../services/notifications';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  const rows = await Expense.find(filter).populate('createdBy', 'name').sort({ expenseDate: -1 }).limit(200);
  res.json(rows);
});

router.post('/', authRequired, async (req, res) => {
  const { projectId, accountId, category, amountPaise, narration, expenseDate, billFileId } = req.body;
  if (!projectId || !accountId || !amountPaise || !category) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const expenseAccount = await Account.findOne({
    companyId: req.user!.companyId,
    name: 'Project Expenses',
  });
  if (!expenseAccount) return res.status(400).json({ error: 'Expense account missing — run seed' });

  try {
    const expense = await withTransaction(async (session) => {
      const row = await createOne<any>(Expense, {
            companyId: req.user!.companyId,
            projectId,
            accountId,
            category,
            amountPaise,
            narration: narration || category,
            expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
            createdBy: req.user!.id,
            billFileId,
          }, session);

      await postLedger({
        companyId: req.user!.companyId,
        projectId,
        debitAccountId: expenseAccount._id,
        creditAccountId: accountId,
        amountPaise,
        narration: `Expense: ${category}`,
        refType: 'EXPENSE',
        refId: row._id,
        createdBy: req.user!.id,
        session,
      });

      let floatQ = PettyCashFloat.findOne({
        projectId,
        accountId,
        holderUserId: req.user!.id,
      });
      if (session) floatQ = floatQ.session(session);
      const float = await floatQ;
      if (float) {
        float.balancePaise -= amountPaise;
        await float.save(sessionOpt(session));
      }

      return row;
    });

    emitCompany(req.user!.companyId, 'expense:created', expense);
    emitProject(projectId, 'expense:created', expense);
    res.status(201).json(expense);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get('/petty-cash', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.user!.role === 'SITE_ENGINEER') filter.holderUserId = req.user!.id;
  const floats = await PettyCashFloat.find(filter).populate('holderUserId', 'name').populate('accountId', 'name');
  res.json(floats);
});

router.post('/petty-cash/request', authRequired, async (req, res) => {
  const { projectId, amountPaise, weekStart, reason } = req.body;
  const row = await PettyCashRequest.create({
    companyId: req.user!.companyId,
    projectId,
    requestedBy: req.user!.id,
    amountPaise,
    weekStart: weekStart ? new Date(weekStart) : new Date(),
    reason: reason || 'Weekly petty cash requirement',
  });
  await notify({
    companyId: req.user!.companyId,
    projectId,
    roles: ['DIRECTOR', 'FINANCE', 'MANAGER'],
    type: 'PETTY_CASH_REQUEST',
    title: 'Petty cash request',
    body: `${req.user!.name} requested ₹${(amountPaise / 100).toLocaleString('en-IN')} for next week`,
    meta: { requestId: row._id.toString() },
  });
  res.status(201).json(row);
});

router.get('/petty-cash/requests', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.status) filter.status = req.query.status;
  const rows = await PettyCashRequest.find(filter)
    .populate('requestedBy', 'name')
    .sort({ createdAt: -1 });
  res.json(rows);
});

router.post(
  '/petty-cash/requests/:id/decide',
  authRequired,
  requireRoles('ADMIN', 'DIRECTOR', 'FINANCE'),
  async (req, res) => {
    const { status, fromAccountId } = req.body as { status: 'APPROVED' | 'REJECTED'; fromAccountId?: string };
    const request = await PettyCashRequest.findOne({ _id: req.params.id, companyId: req.user!.companyId });
    if (!request || request.status !== 'PENDING') return res.status(404).json({ error: 'Not found or decided' });

    request.status = status;
    request.approvedBy = req.user!.id as unknown as typeof request.approvedBy;
    request.decidedAt = new Date();
    await request.save();

    if (status === 'APPROVED' && fromAccountId) {
      let float = await PettyCashFloat.findOne({
        projectId: request.projectId,
        holderUserId: request.requestedBy,
      });
      if (!float) {
        const pcAccount = await Account.create({
          companyId: req.user!.companyId,
          projectId: request.projectId,
          name: `Petty Cash — ${request.requestedBy}`,
          type: 'PETTY_CASH',
          holderUserId: request.requestedBy,
          balancePaise: 0,
        });
        float = await PettyCashFloat.create({
          companyId: req.user!.companyId,
          projectId: request.projectId,
          holderUserId: request.requestedBy,
          accountId: pcAccount._id,
          floatPaise: 0,
          balancePaise: 0,
        });
      }

      await withTransaction(async (session) => {
        await postLedger({
          companyId: req.user!.companyId,
          projectId: request.projectId,
          debitAccountId: float!.accountId,
          creditAccountId: fromAccountId,
          amountPaise: request.amountPaise,
          narration: 'Petty cash top-up',
          refType: 'PETTY_CASH_TOPUP',
          refId: request._id,
          createdBy: req.user!.id,
          session,
        });
        float!.balancePaise += request.amountPaise;
        float!.floatPaise += request.amountPaise;
        await float!.save(sessionOpt(session));
      });
    }

    emitCompany(req.user!.companyId, 'pettycash:updated', request);
    res.json(request);
  }
);

router.post('/vouchers', authRequired, async (req, res) => {
  const {
    projectId,
    payeeName,
    amountPaise,
    purpose,
    signatureFileId,
    voucherFileId,
    signedByName,
    accountId,
    category,
  } = req.body;

  const expenseAccount = await Account.findOne({ companyId: req.user!.companyId, name: 'Project Expenses' });
  if (!expenseAccount) return res.status(400).json({ error: 'Expense account missing' });
  if (!accountId) return res.status(400).json({ error: 'accountId required' });

  try {
    const result = await withTransaction(async (session) => {
      const voucher = await createOne<any>(Voucher, {
            companyId: req.user!.companyId,
            projectId,
            payeeName,
            amountPaise,
            purpose,
            signatureFileId,
            voucherFileId,
            signedByName,
            createdBy: req.user!.id,
            voucherDate: new Date(),
          }, session);

      const expense = await createOne<any>(Expense, {
            companyId: req.user!.companyId,
            projectId,
            accountId,
            category: category || 'LABOUR_WAGES',
            amountPaise,
            narration: purpose,
            expenseDate: new Date(),
            createdBy: req.user!.id,
            voucherId: voucher._id,
          }, session);

      voucher.expenseId = expense._id;
      await voucher.save(sessionOpt(session));

      await postLedger({
        companyId: req.user!.companyId,
        projectId,
        debitAccountId: expenseAccount._id,
        creditAccountId: accountId,
        amountPaise,
        narration: `Voucher: ${payeeName}`,
        refType: 'VOUCHER',
        refId: voucher._id,
        createdBy: req.user!.id,
        session,
      });

      return { voucher, expense };
    });

    emitProject(projectId, 'voucher:created', result.voucher);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get('/vouchers', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  const rows = await Voucher.find(filter).sort({ voucherDate: -1 }).limit(100);
  res.json(rows);
});

export default router;
