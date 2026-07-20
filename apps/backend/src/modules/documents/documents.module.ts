import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
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
  ],
  controllers: [DocumentsController],
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const region = config.get<string>('awsRegion') ?? 'ap-south-1';
        const accessKeyId = config.get<string>('awsAccessKeyId') ?? '';
        const secretAccessKey = config.get<string>('awsSecretAccessKey') ?? '';
        return new S3Client({
          region,
          credentials:
            accessKeyId && secretAccessKey
              ? { accessKeyId, secretAccessKey }
              : undefined,
        });
      },
    },
    S3StorageService,
    DocumentsService,
  ],
  exports: [DocumentsService, S3StorageService, MongooseModule],
})
export class DocumentsModule {}
