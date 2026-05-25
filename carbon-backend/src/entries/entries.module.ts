import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { Entry } from './entry.entity';
import { Factor } from '../factors/factor.entity';
import { Organization } from '../organizations/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Entry, Factor, Organization]),
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
