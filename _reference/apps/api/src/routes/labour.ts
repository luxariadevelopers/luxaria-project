import { Router } from 'express';
import { LabourContract, Attendance } from '../models';
import { authRequired, requireRoles } from '../middleware/auth';
import { emitProject } from '../services/realtime';
import { notify } from '../services/notifications';

const router = Router();

router.get('/contracts', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId, isActive: true };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  res.json(await LabourContract.find(filter));
});

router.post('/contracts', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res) => {
  const row = await LabourContract.create({
    companyId: req.user!.companyId,
    projectId: req.body.projectId,
    contractorName: req.body.contractorName,
    phone: req.body.phone,
    plan: req.body.plan || 'DAILY',
    agreedHeadcount: req.body.agreedHeadcount,
    ratePaise: req.body.ratePaise || 0,
    agreementFileId: req.body.agreementFileId,
  });
  res.status(201).json(row);
});

router.get('/attendance', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.labourContractId) filter.labourContractId = req.query.labourContractId;
  const rows = await Attendance.find(filter)
    .populate('labourContractId', 'contractorName agreedHeadcount')
    .sort({ date: -1 })
    .limit(100);
  res.json(rows);
});

router.post('/attendance', authRequired, async (req, res) => {
  const { projectId, labourContractId, date, masonCount = 0, labourCount = 0, notes } = req.body;
  const contract = await LabourContract.findById(labourContractId);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  const total = masonCount + labourCount;
  const row = await Attendance.findOneAndUpdate(
    { labourContractId, date: new Date(date || Date.now()) },
    {
      companyId: req.user!.companyId,
      projectId,
      labourContractId,
      date: new Date(date || Date.now()),
      masonCount,
      labourCount,
      notes,
      createdBy: req.user!.id,
    },
    { upsert: true, new: true }
  );

  const ratio = contract.agreedHeadcount > 0 ? total / contract.agreedHeadcount : 1;
  if (ratio < 0.5) {
    await notify({
      companyId: req.user!.companyId,
      projectId,
      roles: ['DIRECTOR', 'MANAGER'],
      type: 'LOW_ATTENDANCE',
      title: 'Low labour attendance',
      body: `${contract.contractorName}: only ${total}/${contract.agreedHeadcount} present (masons ${masonCount}, labour ${labourCount}). Consider shifting contract.`,
      meta: { labourContractId, attendanceId: row._id.toString() },
    });
  }

  emitProject(projectId, 'attendance:created', row);
  res.status(201).json(row);
});

export default router;
