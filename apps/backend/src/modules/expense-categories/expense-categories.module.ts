import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';
import { RbacModule } from '../rbac/rbac.module';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseCategoriesSeedService } from './expense-categories.seed.service';
import { ExpenseCategoriesService } from './expense-categories.service';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
} from './schemas/expense-category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExpenseCategory.name, schema: ExpenseCategorySchema },
    ]),
    ChartOfAccountsModule,
    RbacModule,
  ],
  controllers: [ExpenseCategoriesController],
  providers: [ExpenseCategoriesService, ExpenseCategoriesSeedService],
  exports: [ExpenseCategoriesService, MongooseModule],
})
export class ExpenseCategoriesModule {}
