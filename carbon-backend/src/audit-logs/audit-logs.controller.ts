import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  @Get()
  async getList(@Query() query: any) {
    const { userId, action, targetType, from, to, page = 1, pageSize = 20 } = query;
    const qb = this.repo.createQueryBuilder('l').orderBy('l.created_at', 'DESC');
    if (userId) qb.andWhere('l.user_id = :userId', { userId });
    if (action) qb.andWhere('l.action = :action', { action });
    if (targetType) qb.andWhere('l.target_type = :targetType', { targetType });
    if (from) qb.andWhere('l.created_at >= :from', { from });
    if (to) qb.andWhere('l.created_at <= :to', { to });
    const [list, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  @Get(':targetType/:targetId')
  async getByTarget(@Param('targetType') targetType: string, @Param('targetId') targetId: string) {
    return this.repo.find({
      where: { targetType, targetId },
      order: { createdAt: 'DESC' },
    });
  }
}
