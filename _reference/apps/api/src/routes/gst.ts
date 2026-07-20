import { Router } from 'express';
import { gstNetPayable } from '@luxaria/shared';
import { VendorBill, ClientInvoice, Payment } from '../models';
import { authRequired } from '../middleware/auth';
import mongoose from 'mongoose';

const router = Router();

router.get('/summary', authRequired, async (req, res) => {
  const companyId = new mongoose.Types.ObjectId(req.user!.companyId);
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  const billMatch: Record<string, unknown> = { companyId };
  const invMatch: Record<string, unknown> = { companyId };
  const payMatch: Record<string, unknown> = { companyId, type: 'GST_CHALLAN' };

  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    billMatch.billDate = range;
    invMatch.invoiceDate = range;
    payMatch.paymentDate = range;
  }
  if (req.query.projectId) {
    billMatch.projectId = req.query.projectId;
    invMatch.projectId = req.query.projectId;
  }

  const [bills, invoices, payments] = await Promise.all([
    VendorBill.find(billMatch),
    ClientInvoice.find(invMatch),
    Payment.find(payMatch),
  ]);

  const inputPaise = bills.reduce((s, b) => s + b.cgstPaise + b.sgstPaise + b.igstPaise, 0);
  const outputPaise = invoices.reduce((s, b) => s + b.cgstPaise + b.sgstPaise + b.igstPaise, 0);
  const paidPaise = payments.reduce((s, p) => s + p.amountPaise, 0);
  const balancePayablePaise = gstNetPayable(inputPaise, outputPaise, paidPaise);

  res.json({
    inputPaise,
    outputPaise,
    paidPaise,
    balancePayablePaise,
    isCredit: balancePayablePaise < 0,
    billCount: bills.length,
    invoiceCount: invoices.length,
    challanCount: payments.length,
    bills: bills.map((b) => ({
      id: b._id,
      billNumber: b.billNumber,
      billDate: b.billDate,
      gstPaise: b.cgstPaise + b.sgstPaise + b.igstPaise,
      taxablePaise: b.taxablePaise,
    })),
    invoices: invoices.map((i) => ({
      id: i._id,
      invoiceNumber: i.invoiceNumber,
      invoiceDate: i.invoiceDate,
      gstPaise: i.cgstPaise + i.sgstPaise + i.igstPaise,
      taxablePaise: i.taxablePaise,
    })),
  });
});

export default router;
