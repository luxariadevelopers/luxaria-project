import { Global, Module } from '@nestjs/common';

/**
 * Shared utilities module.
 * Business helpers will be added in later phases.
 */
@Global()
@Module({
  providers: [],
  exports: [],
})
export class SharedModule {}
