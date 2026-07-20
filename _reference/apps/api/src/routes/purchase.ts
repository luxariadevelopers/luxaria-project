import { Router } from 'express';
import { Vendor, VendorBill, PurchaseRequest, Payment, Account } from '../models';
import { authRequired, requireRoles } from '../middleware/auth';
import { postLedger, withTransaction, createOne, sessionOpt } from '../services/ledger';
import { emitCompany } from '../services/realtime';
import { notify } from '../services/notifications';

const router = Router();

router.get('/vendors', authRequired, async (req, res) => {
  const vendors = await Vendor.find({ companyId: req.user!.companyId, isActive: true });
  res.json(vendors);
});

router.post('/vendors', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'PURCHASE'), async (req, res) => {
  const vendor = await Vendor.create({
    companyId: req.user!.companyId,
    name: req.body.name,
    gstin: req.body.gstin,
    phone: req.body.phone,
    paymentTerms: req.body.paymentTerms || 'AGAINST_BILL',
    agreementFileId: req.body.agreementFileId,
  });
  res.status(201).json(vendor);
});

router.get('/requests', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  const rows = await PurchaseRequest.find(filter)
    .populate('materialId', 'name unit')
    .populate('requestedBy', 'name')
    .sort({ createdAt: -1 });
  res.json(rows);
});

router.post('/requests', authRequired, async (req, res) => {
  const row = await PurchaseRequest.create({
    companyId: req.user!.companyId,
    projectId: req.body.projectId,
    materialId: req.body.materialId,
    description: req.body.description,
    qty: req.body.qty,
    unit: req.body.unit || 'unit',
    requestedBy: req.user!.id,
  });
  await notify({
    companyId: req.user!.companyId,
    projectId: req.body.projectId,
    roles: ['PURCHASE', 'DIRECTOR'],
    type: 'PURCHASE_REQUEST',
    title: 'New purchase request',
    body: req.body.description,
  });
  res.status(201).json(row);
});

router.get('/bills', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.vendorId) filter.vendorId = req.query.vendorId;
  const bills = await VendorBill.find(filter).populate('vendorId', 'name gstin').sort({ billDate: -1 });
  res.json(bills);
});

router.post('/bills', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'PURCHASE', 'FINANCE'), async (req, res) => {
  const {
    projectId,
    vendorId,
    billNumber,
    billDate,
    taxablePaise,
    cgstPaise = 0,
    sgstPaise = 0,
    igstPaise = 0,
    dueDate,
    billFileId,
  } = req.body;

  const totalPaise = taxablePaise + cgstPaise + sgstPaise + igstPaise;
  const gstInputAccount = await Account.findOne({ companyId: req.user!.companyId, type: 'GST_INPUT' });
  const payableAccount = await Account.findOne({ companyId: req.user!.companyId, name: 'Vendor Payables' });
  if (!gstInputAccount || !payableAccount) return res.status(400).json({ error: 'GST/Payable accounts missing' });

  try {
    const bill = await withTransaction(async (session) => {
      const row = await createOne<any>(VendorBill, {
            companyId: req.user!.companyId,
            projectId,
            vendorId,
            billNumber,
            billDate: new Date(billDate || Date.now()),
            taxablePaise,
            cgstPaise,
            sgstPaise,
            igstPaise,
            totalPaise,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            billFileId,
            createdBy: req.user!.id,
          }, session);

      const gstPaise = cgstPaise + sgstPaise + igstPaise;
      if (gstPaise > 0) {
        await postLedger({
          companyId: req.user!.companyId,
          projectId,
          debitAccountId: gstInputAccount._id,
          creditAccountId: payableAccount._id,
          amountPaise: gstPaise,
          narration: `GST input on bill ${billNumber}`,
          refType: 'VENDOR_BILL_GST',
          refId: row._id,
          createdBy: req.user!.id,
          session,
        });
      }
      if (taxablePaise > 0) {
        const expenseAccount = await Account.findOne({ companyId: req.user!.companyId, name: 'Project Expenses' });
        // session attached below if present
        if (expenseAccount) {
          await postLedger({
            companyId: req.user!.companyId,
            projectId,
            debitAccountId: expenseAccount._id,
            creditAccountId: payableAccount._id,
            amountPaise: taxablePaise,
            narration: `Vendor bill ${billNumber}`,
            refType: 'VENDOR_BILL',
            refId: row._id,
            createdBy: req.user!.id,
            session,
          });
        }
      }

      await Vendor.findByIdAndUpdate(vendorId, { $inc: { balancePaise: totalPaise } }, sessionOpt(session));
      return row;
    });

    emitCompany(req.user!.companyId, 'bill:created', bill);
    res.status(201).json(bill);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/payments', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'FINANCE'), async (req, res) => {
  const {
    projectId,
    vendorId,
    vendorBillId,
    accountId,
    amountPaise,
    transactionId,
    paymentDate,
    receiptFileId,
    type = 'VENDOR',
    notes,
  } = req.body;

  try {
    const payment = await withTransaction(async (session) => {
      const row = await createOne<any>(Payment, {
            companyId: req.user!.companyId,
            projectId,
            vendorId,
            vendorBillId,
            accountId,
            amountPaise,
            transactionId,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            receiptFileId,
            type,
            notes,
            createdBy: req.user!.id,
          }, session);

      if (type === 'VENDOR' && vendorBillId) {
        const bill = session ? await VendorBill.findById(vendorBillId).session(session) : await VendorBill.findById(vendorBillId);
        if (bill) {
          bill.paidPaise += amountPaise;
          bill.status = bill.paidPaise >= bill.totalPaise ? 'CLEARED' : 'PARTIAL';
          await bill.save(sessionOpt(session));
        }
        if (vendorId) {
          await Vendor.findByIdAndUpdate(vendorId, { $inc: { balancePaise: -amountPaise } }, sessionOpt(session));
        }
        const payableAccount = await Account.findOne({ companyId: req.user!.companyId, name: 'Vendor Payables' });
        // session attached below if present
        if (payableAccount) {
          await postLedger({
            companyId: req.user!.companyId,
            projectId,
            debitAccountId: payableAccount._id,
            creditAccountId: accountId,
            amountPaise,
            narration: `Vendor payment ${transactionId || ''}`.trim(),
            refType: 'VENDOR_PAYMENT',
            refId: row._id,
            createdBy: req.user!.id,
            session,
          });
        }
      }

      if (type === 'GST_CHALLAN') {
        const gstPayable = await Account.findOne({ companyId: req.user!.companyId, type: 'GST_PAYABLE' });
        // session attached below if present
        if (gstPayable) {
          await postLedger({
            companyId: req.user!.companyId,
            projectId,
            debitAccountId: gstPayable._id,
            creditAccountId: accountId,
            amountPaise,
            narration: `GST challan ${transactionId || ''}`.trim(),
            refType: 'GST_CHALLAN',
            refId: row._id,
            createdBy: req.user!.id,
            session,
          });
        }
      }

      return row;
    });

    emitCompany(req.user!.companyId, 'payment:created', payment);
    res.status(201).json(payment);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get('/payments', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.type) filter.type = req.query.type;
  const rows = await Payment.find(filter).populate('vendorId', 'name').sort({ paymentDate: -1 }).limit(100);
  res.json(rows);
});

export default router;
