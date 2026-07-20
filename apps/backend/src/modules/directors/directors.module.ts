import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyModule } from '../company/company.module';
import { UsersModule } from '../users/users.module';
import { DirectorsController } from './directors.controller';
import { DirectorsSeedService } from './directors.seed.service';
import { DirectorsService } from './directors.service';
import { ShareholdingService } from './shareholding.service';
import {
  CompanyShareholding,
  CompanyShareholdingSchema,
} from './schemas/company-shareholding.schema';
import {
  DirectorFile,
  DirectorFileSchema,
} from './schemas/director-document.schema';
import { Director, DirectorSchema } from './schemas/director.schema';
import {
  ShareholdingChangeRequest,
  ShareholdingChangeRequestSchema,
} from './schemas/shareholding-change-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Director.name, schema: DirectorSchema },
      { name: DirectorFile.name, schema: DirectorFileSchema },
      { name: CompanyShareholding.name, schema: CompanyShareholdingSchema },
      { name: ShareholdingChangeRequest.name, schema: ShareholdingChangeRequestSchema },
    ]),
    CompanyModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [DirectorsController],
  providers: [DirectorsService, ShareholdingService, DirectorsSeedService],
  exports: [DirectorsService, ShareholdingService, MongooseModule],
})
export class DirectorsModule {}
