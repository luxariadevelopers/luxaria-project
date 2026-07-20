import { Router } from 'express';
import { BoqLine, Expense, Project } from '../models';
import { authRequired, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authRequired, async (req, res) => {
  const filter: Record<string, unknown> = { companyId: req.user!.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  const lines = await BoqLine.find(filter);
  const proposed = lines.reduce((s, l) => s + l.proposedPaise, 0);
  const utilized = lines.reduce((s, l) => s + l.utilizedPaise, 0);
  res.json({ lines, proposedPaise: proposed, utilizedPaise: utilized, balancePaise: proposed - utilized });
});

router.post('/', authRequired, requireRoles('ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res) => {
  const row = await BoqLine.create({
    companyId: req.user!.companyId,
    projectId: req.body.projectId,
    category: req.body.category,
    description: req.body.description,
    proposedPaise: req.body.proposedPaise,
    utilizedPaise: req.body.utilizedPaise || 0,
  });
  res.status(201).json(row);
});

router.get('/project-burn/:projectId', authRequired, async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, companyId: req.user!.companyId });
  if (!project) return res.status(404).json({ error: 'Not found' });
  const expenses = await Expense.aggregate([
    { $match: { projectId: project._id } },
    { $group: { _id: null, total: { $sum: '$amountPaise' } } },
  ]);
  const utilizedPaise = expenses[0]?.total || 0;
  res.json({
    project,
    proposedBudgetPaise: project.proposedBudgetPaise,
    proposedBoqPaise: project.proposedBoqPaise,
    utilizedPaise,
    balancePaise: project.proposedBudgetPaise - utilizedPaise,
    stage: project.stage,
    builtUpAreaSqft: project.builtUpAreaSqft,
  });
});

export default router;
