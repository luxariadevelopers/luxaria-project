import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { S3_CLIENT } from './documents.constants';

export type PresignedPutResult = {
  url: string;
  expiresIn: number;
  headers: Record<string, string>;
};

export type PresignedGetResult = {
  url: string;
  expiresIn: number;
};

export type S3ObjectHead = {
  contentLength: number;
  contentType: string | null;
  checksumSha256: string | null;
  eTag: string | null;
};

/**
 * Thin wrapper around private-bucket S3 operations.
 * Never sets public-read ACLs.
 */
@Injectable()
export class S3StorageService {
  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly configService: ConfigService,
  ) {}

  get bucket(): string {
    const bucket = this.configService.get<string>('awsBucketName') ?? '';
    if (!bucket) {
      throw new ServiceUnavailableException('AWS_BUCKET_NAME is not configured');
    }
    return bucket;
  }

  get prefix(): string {
    const prefix = this.configService.get<string>('awsS3Prefix') ?? 'luxaria-developers/';
    return prefix.endsWith('/') ? prefix : `${prefix}/`;
  }

  get maxUploadBytes(): number {
    return (
      this.configService.get<number>('awsS3MaxUploadBytes') ?? 25 * 1024 * 1024
    );
  }

  get presignExpiresSeconds(): number {
    return this.configService.get<number>('awsS3PresignExpiresSeconds') ?? 900;
  }

  async createPresignedUpload(input: {
    s3Key: string;
    mimeType: string;
    contentLength: number;
  }): Promise<PresignedPutResult> {
    const expiresIn = this.presignExpiresSeconds;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.s3Key,
      ContentType: input.mimeType,
      ContentLength: input.contentLength,
      // Explicitly private — bucket should also block public ACLs
      ACL: undefined,
      ServerSideEncryption: 'AES256',
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn });
    return {
      url,
      expiresIn,
      headers: {
        'Content-Type': input.mimeType,
        'Content-Length': String(input.contentLength),
      },
    };
  }

  async createPresignedDownload(input: {
    s3Key: string;
    fileName?: string;
  }): Promise<PresignedGetResult> {
    const expiresIn = this.presignExpiresSeconds;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: input.s3Key,
      ResponseContentDisposition: input.fileName
        ? `attachment; filename="${input.fileName.replace(/"/g, '')}"`
        : undefined,
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn });
    return { url, expiresIn };
  }

  /**
   * Server-side upload (e.g. generated PDFs). Returns hex SHA-256 of body.
   */
  async putObject(input: {
    s3Key: string;
    body: Buffer;
    mimeType: string;
  }): Promise<{ checksumSha256: string; contentLength: number }> {
    const checksumSha256 = createHash('sha256')
      .update(input.body)
      .digest('hex');
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.s3Key,
        Body: input.body,
        ContentType: input.mimeType,
        ContentLength: input.body.length,
        ServerSideEncryption: 'AES256',
      }),
    );
    return {
      checksumSha256,
      contentLength: input.body.length,
    };
  }

  async headObject(s3Key: string): Promise<S3ObjectHead> {
    const result = await this.s3.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        ChecksumMode: 'ENABLED',
      }),
    );

    let checksumSha256: string | null = null;
    if (result.ChecksumSHA256) {
      checksumSha256 = Buffer.from(result.ChecksumSHA256, 'base64').toString(
        'hex',
      );
    }

    return {
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType ?? null,
      checksumSha256,
      eTag: result.ETag?.replace(/"/g, '') ?? null,
    };
  }
}
