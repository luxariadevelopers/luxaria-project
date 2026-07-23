import { S3Client } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { S3_CLIENT } from './documents.constants';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { S3StorageService } from './s3-storage.service';
import {
  StoredDocument,
  StoredDocumentSchema,
} from './schemas/document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoredDocument.name, schema: StoredDocumentSchema },
    ]),
    ProjectAccessModule,
  ],
  controllers: [DocumentsController],
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const region = (config.get<string>('awsRegion') ?? 'ap-south-1').trim();
        const profile = (config.get<string>('awsProfile') ?? '').trim();
        const accessKeyId = (config.get<string>('awsAccessKeyId') ?? '').trim();
        const secretAccessKey = (
          config.get<string>('awsSecretAccessKey') ?? ''
        ).trim();

        // Keep SDK default-chain helpers aligned with Nest config.
        if (region) {
          process.env.AWS_REGION = region;
          process.env.AWS_DEFAULT_REGION = region;
        }
        if (profile) {
          process.env.AWS_PROFILE = profile;
        }

        const credentials =
          accessKeyId && secretAccessKey
            ? { accessKeyId, secretAccessKey }
            : profile
              ? fromIni({ profile })
              : defaultProvider();

        return new S3Client({
          region,
          credentials,
          // Browser presigned PUTs cannot send flexible checksum headers.
          requestChecksumCalculation: 'WHEN_REQUIRED',
          responseChecksumValidation: 'WHEN_REQUIRED',
        });
      },
    },
    S3StorageService,
    DocumentsService,
  ],
  exports: [DocumentsService, S3StorageService, MongooseModule],
})
export class DocumentsModule {}
