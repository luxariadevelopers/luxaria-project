import { Router } from 'express';
import { Material, StockMovement, PurchaseRequest } from '../models';
import { authRequired, requireRoles } from '../middleware/auth';
import { emitProject } from '../services/realtime';
import { notify } from '../services/notifications';

const router = Router();

router.get('/materials', authRequired, async (req, res) => {
  const materials = await Material.find({ companyId: req.user!.companyId, isActive: true });
  res.json(materials);
});

router.post('/materials', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'PURCHASE'), async (req, res) => {
  const material = await Material.create({
    companyId: req.user!.companyId,
    name: req.body.name,
    unit: req.body.unit,
    normPerSqft: req.body.normPerSqft,
  });
  res.status(201).json(material);
});

router.get('/movements', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  const rows = await StockMovement.find(filter)
    .populate('materialId', 'name unit')
    .populate('vendorId', 'name')
    .populate('createdBy', 'name')
    .sort({ movementDate: -1 })
    .limit(200);
  res.json(rows);
});

router.get('/balances', authRequired, async (req, res) => {
  const match: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) match.projectId = req.query.projectId;
  if (req.query.vendorId) match.vendorId = req.query.vendorId;

  const balances = await StockMovement.aggregate([
    { $match: match },
    {
      $group: {
        _id: { materialId: '$materialId', vendorId: '$vendorId' },
        qty: {
          $sum: {
            $cond: [{ $eq: ['$type', 'OUT'] }, { $multiply: ['$qty', -1] }, '$qty'],
          },
        },
      },
    },
  ]);
  res.json(balances);
});

router.post('/receive', authRequired, async (req, res) => {
  const { projectId, materialId, vendorId, qty, photoFileId, billFileId, notes, movementDate } = req.body;
  const row = await StockMovement.create({
    companyId: req.user!.companyId,
    projectId,
    materialId,
    vendorId,
    type: 'IN',
    qty,
    photoFileId,
    billFileId,
    notes,
    createdBy: req.user!.id,
    movementDate: movementDate ? new Date(movementDate) : new Date(),
  });
  emitProject(projectId, 'stock:received', row);
  res.status(201).json(row);
});

router.post('/low-stock-alert', authRequired, async (req, res) => {
  const { projectId, materialId, qty, notes } = req.body;
  const row = await StockMovement.create({
    companyId: req.user!.companyId,
    projectId,
    materialId,
    type: 'ADJUST',
    qty: qty || 0,
    notes: notes || 'Load finishing — need order',
    lowStockAlert: true,
    createdBy: req.user!.id,
    movementDate: new Date(),
  });

  const pr = await PurchaseRequest.create({
    companyId: req.user!.companyId,
    projectId,
    materialId,
    description: notes || 'Reorder from low stock alert',
    qty: qty || 1,
    unit: 'unit',
    requestedBy: req.user!.id,
  });

  await notify({
    companyId: req.user!.companyId,
    projectId,
    roles: ['DIRECTOR', 'PURCHASE', 'MANAGER'],
    type: 'LOW_STOCK',
    title: 'Material finishing — reorder needed',
    body: notes || 'Site engineer flagged low stock',
    meta: { stockMovementId: row._id.toString(), purchaseRequestId: pr._id.toString() },
  });

  emitProject(projectId, 'stock:low', { row, pr });
  res.status(201).json({ alert: row, purchaseRequest: pr });
});

export default router;
