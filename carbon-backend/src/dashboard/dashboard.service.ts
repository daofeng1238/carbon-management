import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entry } from '../entries/entry.entity';
import { Organization } from '../organizations/organization.entity';

const CATEGORY_META: Record<string, { name: string; scope: number; color: string }> = {
  FUEL:      { name: '化石燃料燃烧', scope: 1, color: '#d97757' },
  PROCESS:   { name: '工业过程排放', scope: 1, color: '#d97757' },
  FUGITIVE:  { name: '逸散排放',     scope: 1, color: '#d97757' },
  ELEC:      { name: '净购入电力',   scope: 2, color: '#4a86e8' },
  HEAT:      { name: '净购入热力',   scope: 2, color: '#4a86e8' },
  TRANSPORT: { name: '上下游运输',   scope: 3, color: '#36c4a8' },
  WASTE:     { name: '废弃物处理',   scope: 3, color: '#36c4a8' },
  BUSINESS:  { name: '员工差旅与通勤', scope: 3, color: '#36c4a8' },
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Entry) private entryRepo: Repository<Entry>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
  ) {}

  private async getDescendantIds(orgId: string): Promise<string[]> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) return [orgId];
    const rows = await this.orgRepo
      .createQueryBuilder('o')
      .select('o.id')
      .where(`(o.path = :path OR o.path LIKE :prefix)`, { path: org.path, prefix: org.path + '.%' })
      .andWhere('o.deleted_at IS NULL')
      .getRawMany();
    return rows.map((r) => r.o_id);
  }

  async getOverview(query: any) {
    const { orgId, periodStart, periodEnd, compareWith } = query;

    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    const ids = await this.getDescendantIds(orgId);

    const qb = this.entryRepo
      .createQueryBuilder('e')
      .where('e.org_id IN (:...ids)', { ids })
      .andWhere('e.status IN (:...st)', { st: ['submitted', 'approved'] });

    if (periodStart) qb.andWhere('e.period >= :ps', { ps: periodStart });
    if (periodEnd) qb.andWhere('e.period <= :pe', { pe: periodEnd });

    const entries = await qb.getMany();

    const byScope: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, any> = {};
    const byOrg: Record<string, number> = {};
    let entryCount = entries.length;
    let manualCount = 0;

    for (const e of entries) {
      const v = +e.emission;
      byScope[e.scope] = (byScope[e.scope] || 0) + v;
      byCategory[e.categoryCode] = (byCategory[e.categoryCode] || 0) + v;
      if (!byMonth[e.period]) byMonth[e.period] = { period: e.period, s1: 0, s2: 0, s3: 0, total: 0 };
      byMonth[e.period][`s${e.scope}`] += v;
      byMonth[e.period].total += v;
      byOrg[e.orgId] = (byOrg[e.orgId] || 0) + v;
      if (e.source === 'manual') manualCount++;
    }

    const total = (byScope[1] || 0) + (byScope[2] || 0) + (byScope[3] || 0);

    const sortedMonths = Object.values(byMonth).sort((a: any, b: any) => a.period.localeCompare(b.period));

    const byCategoryArr = Object.entries(byCategory).map(([code, value]) => ({
      code,
      name: CATEGORY_META[code]?.name || code,
      scope: CATEGORY_META[code]?.scope || 1,
      value,
      color: CATEGORY_META[code]?.color || '#ccc',
    })).sort((a, b) => b.value - a.value);

    const subOrgs = await this.orgRepo.findByIds(Object.keys(byOrg));
    const bySubOrg = subOrgs.map((o) => ({
      id: o.id,
      name: o.name,
      level: o.level,
      total: byOrg[o.id] || 0,
      byScope: {},
    })).sort((a, b) => b.total - a.total);

    const employees = org?.employees || 1;
    const intensity = total > 0 ? +(total / employees).toFixed(4) : 0;

    let deltaPercent: number | null = null;
    if (compareWith === 'prior' && periodStart && periodEnd) {
      const months = this.monthDiff(periodStart, periodEnd);
      const priorStart = this.shiftMonths(periodStart, -months - 1);
      const priorEnd = this.shiftMonths(periodEnd, -months - 1);
      const priorEntries = await this.entryRepo
        .createQueryBuilder('e')
        .where('e.org_id IN (:...ids)', { ids })
        .andWhere('e.status IN (:...st)', { st: ['submitted', 'approved'] })
        .andWhere('e.period >= :ps', { ps: priorStart })
        .andWhere('e.period <= :pe', { pe: priorEnd })
        .getMany();
      const priorTotal = priorEntries.reduce((s, e) => s + +e.emission, 0);
      if (priorTotal > 0) deltaPercent = +((total - priorTotal) / priorTotal * 100).toFixed(1);
    }

    const orgPath = org?.path || '';
    const descendants = await this.orgRepo
      .createQueryBuilder('o')
      .where(`(o.path = :path OR o.path LIKE :prefix)`, { path: orgPath, prefix: orgPath + '.%' })
      .andWhere('o.deleted_at IS NULL')
      .getMany();
    const leafCount = descendants.filter((o) => o.level === 4).length;

    return {
      orgInfo: { id: org?.id, name: org?.name, code: org?.code, industry: org?.industryCode, standard: org?.standard, employees: org?.employees },
      period: { start: periodStart, end: periodEnd },
      total,
      byScope,
      byCategory: byCategoryArr,
      byMonth: sortedMonths,
      bySubOrg,
      stats: {
        entryCount,
        manualCount,
        descendantCount: descendants.length,
        leafCount,
        intensity,
        deltaPercent,
      },
    };
  }

  async getTrend(query: any) {
    const { orgId, periodStart, periodEnd, groupBy = 'month' } = query;
    const ids = await this.getDescendantIds(orgId);

    const qb = this.entryRepo
      .createQueryBuilder('e')
      .where('e.org_id IN (:...ids)', { ids })
      .andWhere('e.status IN (:...st)', { st: ['submitted', 'approved'] });

    if (periodStart) qb.andWhere('e.period >= :ps', { ps: periodStart });
    if (periodEnd) qb.andWhere('e.period <= :pe', { pe: periodEnd });

    const entries = await qb.getMany();

    const groups: Record<string, { s1: number; s2: number; s3: number; total: number }> = {};
    for (const e of entries) {
      let key = e.period;
      if (groupBy === 'quarter') {
        const [y, m] = e.period.split('-');
        key = `${y}-Q${Math.ceil(+m / 3)}`;
      } else if (groupBy === 'year') {
        key = e.period.substring(0, 4);
      }
      if (!groups[key]) groups[key] = { s1: 0, s2: 0, s3: 0, total: 0 };
      const v = +e.emission;
      groups[key][`s${e.scope}`] += v;
      groups[key].total += v;
    }

    return Object.entries(groups)
      .map(([period, vals]) => ({ period, ...vals }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private monthDiff(start: string, end: string): number {
    const [sy, sm] = start.split('-').map(Number);
    const [ey, em] = end.split('-').map(Number);
    return (ey - sy) * 12 + (em - sm);
  }

  private shiftMonths(period: string, delta: number): string {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
