import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { authRequired } from '../middleware/auth';
import { saveAuditFile, getFileAccessUrl } from '../services/files';
import type { AuditDocType } from '../models';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();

router.post('/upload', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const docType = (req.body.docType || 'OTHER') as AuditDocType;
  const file = await saveAuditFile({
    companyId: req.user!.companyId,
    projectId: req.body.projectId,
    docType,
    fileName: req.file.originalname,
    contentType: req.file.mimetype,
    buffer: req.file.buffer,
    uploadedBy: req.user!.id,
  });
  res.status(201).json(file);
});

router.get('/:id/url', authRequired, async (req, res) => {
  const access = await getFileAccessUrl(req.params.id);
  if (!access) return res.status(404).json({ error: 'Not found' });
  if (access.type === 'url') return res.json({ url: access.url, storage: 'S3' });
  res.json({ storage: 'LOCAL', fileId: req.params.id, downloadPath: `/api/v1/files/${req.params.id}/download` });
});

router.get('/:id/download', authRequired, async (req, res) => {
  const access = await getFileAccessUrl(req.params.id);
  if (!access || access.type !== 'local' || !access.path) return res.status(404).json({ error: 'Not found' });
  if (!fs.existsSync(access.path)) return res.status(404).json({ error: 'File missing on disk' });
  res.setHeader('Content-Type', access.file.contentType);
  res.setHeader('Content-Disposition', `inline; filename="${access.file.fileName}"`);
  fs.createReadStream(access.path).pipe(res);
});

export default router;
