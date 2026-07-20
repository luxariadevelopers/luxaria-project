import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { config } from '../config';
import { AuditFile, AuditDocType } from '../models';
import { Types } from 'mongoose';

function s3Enabled() {
  return Boolean(config.aws.accessKeyId && config.aws.secretAccessKey && !config.useLocalUploads);
}

function getS3() {
  return new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });
}

/** All Luxaria files go under: luxaria-developers/... */
function buildS3Key(parts: string[]) {
  const safe = parts.map((p) => p.replace(/^\/+|\/+$/g, '').replace(/\.\./g, ''));
  return `${config.aws.prefix}${safe.join('/')}`;
}

export async function saveAuditFile(params: {
  companyId: string;
  projectId?: string;
  docType: AuditDocType;
  fileName: string;
  contentType: string;
  buffer: Buffer;
  uploadedBy: string;
}) {
  const sha256 = crypto.createHash('sha256').update(params.buffer).digest('hex');
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = buildS3Key([
    params.companyId,
    params.projectId || 'company',
    params.docType,
    `${uuid()}-${safeName}`,
  ]);

  if (s3Enabled()) {
    const s3 = getS3();
    const put: ConstructorParameters<typeof PutObjectCommand>[0] = {
      Bucket: config.aws.bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType,
      Metadata: {
        companyId: params.companyId,
        projectId: params.projectId || '',
        docType: params.docType,
        sha256,
      },
    };

    if (config.aws.objectLock) {
      put.ObjectLockMode = 'COMPLIANCE';
      put.ObjectLockRetainUntilDate = new Date(
        Date.now() + config.aws.retentionYears * 365.25 * 24 * 60 * 60 * 1000
      );
    }

    await s3.send(new PutObjectCommand(put));
    return AuditFile.create({
      companyId: params.companyId,
      projectId: params.projectId,
      docType: params.docType,
      fileName: params.fileName,
      contentType: params.contentType,
      sizeBytes: params.buffer.length,
      sha256,
      storage: 'S3',
      s3Bucket: config.aws.bucket,
      s3Key: key,
      retentionYears: config.aws.retentionYears,
      uploadedBy: params.uploadedBy,
    });
  }

  fs.mkdirSync(config.uploadDir, { recursive: true });
  const localPath = path.join(config.uploadDir, key.replace(/\//g, '_'));
  fs.writeFileSync(localPath, params.buffer);
  return AuditFile.create({
    companyId: params.companyId,
    projectId: params.projectId,
    docType: params.docType,
    fileName: params.fileName,
    contentType: params.contentType,
    sizeBytes: params.buffer.length,
    sha256,
    storage: 'LOCAL',
    localPath,
    retentionYears: config.aws.retentionYears,
    uploadedBy: params.uploadedBy,
  });
}

export async function getFileAccessUrl(fileId: string | Types.ObjectId) {
  const file = await AuditFile.findById(fileId);
  if (!file) return null;
  if (file.storage === 'LOCAL' && file.localPath) {
    return { type: 'local' as const, path: file.localPath, file };
  }
  if (file.storage === 'S3' && file.s3Key) {
    const url = await getSignedUrl(
      getS3(),
      new GetObjectCommand({ Bucket: file.s3Bucket || config.aws.bucket, Key: file.s3Key }),
      { expiresIn: 900 }
    );
    return { type: 'url' as const, url, file };
  }
  return null;
}

/** Creates the Luxaria folder marker inside the shared bucket */
export async function ensureLuxariaS3Folder() {
  if (!s3Enabled()) {
    console.warn('S3 not enabled — skip folder create');
    return;
  }
  const key = `${config.aws.prefix}.keep`;
  await getS3().send(
    new PutObjectCommand({
      Bucket: config.aws.bucket,
      Key: key,
      Body: Buffer.from(
        'Luxaria Developers Pvt Limited — audit storage folder for bills, vouchers, GRN photos, agreements.\n'
      ),
      ContentType: 'text/plain',
    })
  );
  console.log(`S3 folder ready: s3://${config.aws.bucket}/${config.aws.prefix}`);
}
