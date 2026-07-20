import { Router } from 'express';
import { SaleUnit, SaleAdvance, ClientInvoice, Account } from '../models';
import { authRequired, requireRoles } from '../middleware/auth';
import { postLedger, withTransaction, createOne, sessionOpt } from '../services/ledger';
import { emitCompany, emitProject } from '../services/realtime';

const router = Router();

router.get('/units', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  res.json(await SaleUnit.find(filter).sort({ createdAt: -1 }));
});

router.post('/units', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'MANAGER', 'FINANCE'), async (req, res) => {
  const row = await SaleUnit.create({
    companyId: req.user!.companyId,
    projectId: req.body.projectId,
    clientName: req.body.clientName,
    phone: req.body.phone,
    block: req.body.block,
    plot: req.body.plot,
    fundingType: req.body.fundingType || 'OWN_FUND',
    freezeStatus: req.body.freezeStatus || 'TOKEN',
    totalValuePaise: req.body.totalValuePaise || 0,
  });
  res.status(201).json(row);
});

router.post('/advances', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'FINANCE'), async (req, res) => {
  const { projectId, saleUnitId, amountPaise, accountId, date, notes } = req.body;
  const equity = await Account.findOne({ companyId: req.user!.companyId, name: 'Client Advances' });
  if (!equity) return res.status(400).json({ error: 'Client Advances account missing' });

  try {
    const advance = await withTransaction(async (session) => {
      const [row] = await SaleAdvance.create(
        [
          {
            companyId: req.user!.companyId,
            projectId,
            saleUnitId,
            amountPaise,
            accountId,
            date: date ? new Date(date) : new Date(),
            notes,
            createdBy: req.user!.id,
          },
        ],
        { session }
      );
      await postLedger({
        companyId: req.user!.companyId,
        projectId,
        debitAccountId: accountId,
        creditAccountId: equity._id,
        amountPaise,
        narration: 'Client advance received',
        refType: 'SALE_ADVANCE',
        refId: row._id,
        createdBy: req.user!.id,
        session,
      });
      return row;
    });
    emitProject(projectId, 'sale:advance', advance);
    res.status(201).json(advance);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get('/advances', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  res.json(await SaleAdvance.find(filter).populate('saleUnitId').sort({ date: -1 }));
});

router.post('/invoices', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'FINANCE'), async (req, res) => {
  const {
    projectId,
    saleUnitId,
    invoiceNumber,
    invoiceDate,
    taxablePaise,
    cgstPaise = 0,
    sgstPaise = 0,
    igstPaise = 0,
    invoiceFileId,
  } = req.body;

  const totalPaise = taxablePaise + cgstPaise + sgstPaise + igstPaise;
  const gstOutput = await Account.findOne({ companyId: req.user!.companyId, type: 'GST_OUTPUT' });
  const receivable = await Account.findOne({ companyId: req.user!.companyId, name: 'Client Receivables' });
  if (!gstOutput || !receivable) return res.status(400).json({ error: 'GST/Receivable accounts missing' });

  try {
    const invoice = await withTransaction(async (session) => {
      const [row] = await ClientInvoice.create(
        [
          {
            companyId: req.user!.companyId,
            projectId,
            saleUnitId,
            invoiceNumber,
            invoiceDate: new Date(invoiceDate || Date.now()),
            taxablePaise,
            cgstPaise,
            sgstPaise,
            igstPaise,
            totalPaise,
            invoiceFileId,
            createdBy: req.user!.id,
          },
        ],
        { session }
      );

      const gstPaise = cgstPaise + sgstPaise + igstPaise;
      if (gstPaise > 0) {
        await postLedger({
          companyId: req.user!.companyId,
          projectId,
          debitAccountId: receivable._id,
          creditAccountId: gstOutput._id,
          amountPaise: gstPaise,
          narration: `GST output invoice ${invoiceNumber}`,
          refType: 'CLIENT_INVOICE_GST',
          refId: row._id,
          createdBy: req.user!.id,
          session,
        });
      }
      return row;
    });

    emitCompany(req.user!.companyId, 'invoice:created', invoice);
    res.status(201).json(invoice);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get('/invoices', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  res.json(await ClientInvoice.find(filter).populate('saleUnitId').sort({ invoiceDate: -1 }));
});

export default router;
