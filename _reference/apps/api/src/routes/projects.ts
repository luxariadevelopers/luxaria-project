import { Router } from 'express';
import { Project } from '../models';
import { authRequired, requireRoles } from '../middleware/auth';
import { emitCompany } from '../services/realtime';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (['INVESTOR', 'SITE_ENGINEER'].includes(req.user!.role)) {
    filter._id = { $in: req.user!.projectIds };
  }
  const projects = await Project.find(filter).sort({ createdAt: -1 });
  res.json(projects);
});

router.post('/', authRequired, requireRoles('ADMIN', 'DIRECTOR'), async (req, res) => {
  const { name, location, stage, proposedBudgetPaise, proposedBoqPaise } = req.body;
  const project = await Project.create({
    companyId: req.user!.companyId,
    name,
    location,
    stage: stage || 'LAND',
    proposedBudgetPaise: proposedBudgetPaise || 0,
    proposedBoqPaise: proposedBoqPaise || 0,
  });
  emitCompany(req.user!.companyId, 'project:created', project);
  res.status(201).json(project);
});

router.patch('/:id', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res) => {
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user!.companyId },
    {
      $set: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.location !== undefined && { location: req.body.location }),
        ...(req.body.stage && { stage: req.body.stage }),
        ...(req.body.proposedBudgetPaise !== undefined && { proposedBudgetPaise: req.body.proposedBudgetPaise }),
        ...(req.body.proposedBoqPaise !== undefined && { proposedBoqPaise: req.body.proposedBoqPaise }),
        ...(req.body.builtUpAreaSqft !== undefined && { builtUpAreaSqft: req.body.builtUpAreaSqft }),
        ...(req.body.status && { status: req.body.status }),
      },
    },
    { new: true }
  );
  if (!project) return res.status(404).json({ error: 'Not found' });
  emitCompany(req.user!.companyId, 'project:updated', project);
  res.json(project);
});

export default router;
