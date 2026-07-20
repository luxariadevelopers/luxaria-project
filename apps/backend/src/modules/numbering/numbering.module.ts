import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NumberingService } from './numbering.service';
import { Counter, CounterSchema } from './schemas/counter.schema';

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Counter.name, schema: CounterSchema }])],
  providers: [NumberingService],
  exports: [NumberingService, MongooseModule],
})
export class NumberingModule {}
