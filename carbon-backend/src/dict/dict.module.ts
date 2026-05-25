import { Module } from '@nestjs/common';
import { DictController } from './dict.controller';

@Module({
  controllers: [DictController],
})
export class DictModule {}
