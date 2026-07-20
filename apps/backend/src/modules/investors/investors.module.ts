import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyModule } from '../company/company.module';
import { DirectorsModule } from '../directors/directors.module';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';
import { InvestorsController } from './investors.controller';
import { InvestorsService } from './investors.service';
import {
  InvestorFile,
  InvestorFileSchema,
} from './schemas/investor-document.schema';
import { Investor, InvestorSchema } from './schemas/investor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Investor.name, schema: InvestorSchema },
      { name: InvestorFile.name, schema: InvestorFileSchema },
    ]),
    CompanyModule,
    DirectorsModule,
    RbacModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [InvestorsController],
  providers: [InvestorsService],
  exports: [InvestorsService, MongooseModule],
})
export class InvestorsModule {}
