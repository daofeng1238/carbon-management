import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Report } from './report.entity';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private repo: Repository<Report>,
    private dashboardService: DashboardService,
  ) {}

  private async buildSnapshot(config: any) {
    const { orgId, reportPeriod } = config;
    let periodStart = '', periodEnd = '';

    if (/^\d{4}$/.test(reportPeriod)) {
      periodStart = `${reportPeriod}-01`;
      periodEnd = `${reportPeriod}-12`;
    } else if (/^\d{4}Q[1-4]$/.test(reportPeriod)) {
      const [y, q] = reportPeriod.split('Q');
      const startMonth = (parseInt(q) - 1) * 3 + 1;
      periodStart = `${y}-${String(startMonth).padStart(2, '0')}`;
      periodEnd = `${y}-${String(startMonth + 2).padStart(2, '0')}`;
    } else if (/^\d{4}H[12]$/.test(reportPeriod)) {
      const [y, h] = reportPeriod.split('H');
      periodStart = h === '1' ? `${y}-01` : `${y}-07`;
      periodEnd = h === '1' ? `${y}-06` : `${y}-12`;
    }

    return this.dashboardService.getOverview({
      orgId,
      periodStart,
      periodEnd,
      compareWith: 'prior',
    });
  }

  async preview(config: any) {
    const snapshot = await this.buildSnapshot(config);
    return { snapshot };
  }

  async create(config: any, userId: string) {
    const snapshot = await this.buildSnapshot(config);

    const maxId = await this.repo.createQueryBuilder('r').select('MAX(r.id)', 'max').getRawOne();
    let nextNum = 1;
    if (maxId?.max) {
      const match = maxId.max.match(/^R-\d{4}-(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    const year = new Date().getFullYear();
    const id = `R-${year}-${String(nextNum).padStart(3, '0')}`;

    let periodStart = '', periodEnd = '';
    const rp = config.reportPeriod;
    if (/^\d{4}$/.test(rp)) { periodStart = `${rp}-01`; periodEnd = `${rp}-12`; }
    else if (/^\d{4}Q[1-4]$/.test(rp)) {
      const [y, q] = rp.split('Q');
      const sm = (parseInt(q) - 1) * 3 + 1;
      periodStart = `${y}-${String(sm).padStart(2, '0')}`;
      periodEnd = `${y}-${String(sm + 2).padStart(2, '0')}`;
    }

    const report = this.repo.create({
      id,
      title: config.title || `${snapshot.orgInfo?.name} ${rp} 碳排放报告`,
      orgId: config.orgId,
      period: rp,
      periodStart,
      periodEnd,
      scope: config.scope || 'self',
      standard: config.standard || 'ISO',
      config,
      snapshot,
      status: 'final',
      createdBy: userId,
    });

    return this.repo.save(report);
  }

  async getList(query: any) {
    const { page = 1, pageSize = 10 } = query;
    const [list, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async getById(id: string) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException();
    return r;
  }

  async remove(id: string) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException();
    await this.repo.delete(id);
    return null;
  }
}
