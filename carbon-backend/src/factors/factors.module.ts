import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FactorsController } from './factors.controller';
import { FactorsService } from './factors.service';
import { Factor } from './factor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factor]),
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [FactorsController],
  providers: [FactorsService],
  exports: [FactorsService],
})
export class FactorsModule {}
