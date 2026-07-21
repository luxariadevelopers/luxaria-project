import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyModule } from '../company/company.module';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { SessionModule } from '../sessions/session.module';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    CompanyModule,
    SessionModule,
    forwardRef(() => RbacModule),
    forwardRef(() => ProjectAccessModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
