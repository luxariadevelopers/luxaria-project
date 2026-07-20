import { Router } from 'express';
import { gstNetPayable } from '@luxaria/shared';
import {
  Account,
  Contribution,
  Expense,
  VendorBill,
  ClientInvoice,
  Payment,
  StockMovement,
  Attendance,
  Project,
  PettyCashFloat,
} from '../models';
import { authRequired } from '../middleware/auth';

const router = Router();

router.get('/overview', authRequired, async (req, res) => {
  const companyId = req.user!.companyId;
  const projectFilter =
    req.user!.role === 'INVESTOR' || req.user!.role === 'SITE_ENGINEER'
      ? { companyId, _id: { $in: req.user!.projectIds } }
      : { companyId };

  const projects = await Project.find(projectFilter);

  const contribMatch: Record<string, unknown> = { companyId };
  if (req.user!.role === 'INVESTOR') {
    contribMatch.investorUserId = req.user!.id;
    contribMatch.projectId = { $in: req.user!.projectIds };
  }

  const contributions = await Contribution.find(contribMatch);
  const investedCash = contributions.filter((c) => c.mode === 'cash').reduce((s, c) => s + c.amountPaise, 0);
  const investedBank = contributions.filter((c) => c.mode === 'bank').reduce((s, c) => s + c.amountPaise, 0);

  const accounts = await Account.find({ companyId, isActive: true });
  const bankBalances = accounts
    .filter((a) => a.type === 'BANK')
    .map((a) => ({ id: a._id, name: a.name, balancePaise: a.balancePaise }));
  const cashBalances = accounts
    .filter((a) => a.type === 'CASH' || a.type === 'PETTY_CASH')
    .map((a) => ({ id: a._id, name: a.name, type: a.type, balancePaise: a.balancePaise, holderUserId: a.holderUserId }));

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

  const expenseMatch: Record<string, unknown> = { companyId };
  if (req.query.projectId) expenseMatch.projectId = req.query.projectId;

  const [todayExpenses, mtdExpenses] = await Promise.all([
    Expense.aggregate([
      { $match: { ...expenseMatch, expenseDate: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
    Expense.aggregate([
      { $match: { ...expenseMatch, expenseDate: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
  ]);

  const vendorBills = await VendorBill.find({ companyId });
  const gstInput = vendorBills.reduce((s, b) => s + b.cgstPaise + b.sgstPaise + b.igstPaise, 0);
  const clientInvoices = await ClientInvoice.find({ companyId });
  const gstOutput = clientInvoices.reduce((s, b) => s + b.cgstPaise + b.sgstPaise + b.igstPaise, 0);
  const gstPaidPaise = (await Payment.find({ companyId, type: 'GST_CHALLAN' })).reduce(
    (s, p) => s + p.amountPaise,
    0
  );

  const openPayables = vendorBills
    .filter((b) => b.status !== 'CLEARED')
    .reduce((s, b) => s + (b.totalPaise - b.paidPaise), 0);

  const floats = await PettyCashFloat.find({ companyId }).populate('holderUserId', 'name');

  const recentStock = await StockMovement.find({ companyId }).sort({ createdAt: -1 }).limit(10)
    .populate('materialId', 'name unit');
  const todayAttendance = await Attendance.find({ companyId, date: { $gte: startOfDay } })
    .populate('labourContractId', 'contractorName agreedHeadcount');

  res.json({
    projects,
    investment: {
      totalPaise: investedCash + investedBank,
      cashPaise: investedCash,
      bankPaise: investedBank,
    },
    bankBalances,
    cashBalances,
    pettyCashFloats: floats,
    expenses: {
      todayPaise: todayExpenses[0]?.total || 0,
      mtdPaise: mtdExpenses[0]?.total || 0,
    },
    gst: {
      inputPaise: gstInput,
      outputPaise: gstOutput,
      paidPaise: gstPaidPaise,
      balancePayablePaise: gstNetPayable(gstInput, gstOutput, gstPaidPaise),
    },
    openPayablesPaise: openPayables,
    recentStock,
    todayAttendance,
  });
});

export default router;
