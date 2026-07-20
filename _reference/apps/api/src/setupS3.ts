import { config } from './config';
import { ensureLuxariaS3Folder } from './services/files';

async function main() {
  console.log('Bucket:', config.aws.bucket);
  console.log('Region:', config.aws.region);
  console.log('Prefix:', config.aws.prefix);
  await ensureLuxariaS3Folder();

  // Subfolder markers for clarity in the console
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });

  const subfolders = [
    'bills',
    'vouchers',
    'signatures',
    'grn-photos',
    'agreements',
    'payment-receipts',
    'gst-challans',
    'other',
  ];

  for (const folder of subfolders) {
    const key = `${config.aws.prefix}${folder}/.keep`;
    await s3.send(
      new PutObjectCommand({
        Bucket: config.aws.bucket,
        Key: key,
        Body: Buffer.from(`${folder}\n`),
        ContentType: 'text/plain',
      })
    );
    console.log('  created:', key);
  }

  console.log('\nDone. All Luxaria files will be stored under luxaria-developers/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
