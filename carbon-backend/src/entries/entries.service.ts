import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Entry } from './entry.entity';
import { Factor } from '../factors/factor.entity';
import { Organization } from '../organizations/organization.entity';

const CATEGORY_SCOPE: Record<string, number> = {
  FUEL: 1, PROCESS: 1, FUGITIVE: 1, ELEC: 2, HEAT: 2, TRANSPORT: 3, WASTE: 3, BUSINESS: 3,
};

@Injectable()
export class EntriesService {
  constructor(
    @InjectRepository(Entry) private repo: Repository<Entry>,
    @InjectRepository(Factor) private factorRepo: Repository<Factor>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
  ) {}

  private async getDescendantIds(orgId: string): Promise<string[]> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) return [orgId];
    const descendants = await this.orgRepo
      .createQueryBuilder('o')
      .select('o.id')
      .where(`(o.path = :path OR o.path LIKE :prefix)`, { path: org.path, prefix: org.path + '.%' })
      .andWhere('o.deleted_at IS NULL')
      .getRawMany();
    return descendants.map((d) => d.o_id);
  }

  async getSummary(query: any) {
    const { orgId, includeDescendants, period, periodStart, periodEnd, scope, category, status } = query;
    const qb = this.repo.createQueryBuilder('e');
    if (orgId) {
      if (includeDescendants === 'true') {
        const ids = await this.getDescendantIds(orgId);
        qb.andWhere('e.org_id IN (:...ids)', { ids });
      } else {
        qb.andWhere('e.org_id = :orgId', { orgId });
      }
    }
    if (period) qb.andWhere('e.period = :period', { period });
    if (periodStart) qb.andWhere('e.period >= :periodStart', { periodStart });
    if (periodEnd) qb.andWhere('e.period <= :periodEnd', { periodEnd });
    if (scope) qb.andWhere('e.scope = :scope', { scope: +scope });
    if (category) qb.andWhere('e.category_code = :category', { category });
    if (status) qb.andWhere('e.status = :status', { status });

    const result = await qb
      .select('e.scope', 'scope')
      .addSelect('SUM(e.emission)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.scope')
      .getRawMany();

    const byScope: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let grandTotal = 0, totalCount = 0;
    for (const r of result) {
      byScope[+r.scope] = +(+r.total).toFixed(2);
      grandTotal += +r.total;
      totalCount += +r.count;
    }
    return { total: +grandTotal.toFixed(2), byScope, count: totalCount };
  }

  async getList(query: any) {
    const { orgId, includeDescendants, period, periodStart, periodEnd, scope, category, status, keyword, page = 1, pageSize = 10 } = query;
    const qb = this.repo.createQueryBuilder('e');

    if (orgId) {
      if (includeDescendants === 'true') {
        const ids = await this.getDescendantIds(orgId);
        qb.andWhere('e.org_id IN (:...ids)', { ids });
      } else {
        qb.andWhere('e.org_id = :orgId', { orgId });
      }
    }
    if (period) qb.andWhere('e.period = :period', { period });
    if (periodStart) qb.andWhere('e.period >= :periodStart', { periodStart });
    if (periodEnd) qb.andWhere('e.period <= :periodEnd', { periodEnd });
    if (scope) qb.andWhere('e.scope = :scope', { scope: +scope });
    if (category) qb.andWhere('e.category_code = :category', { category });
    if (status) qb.andWhere('e.status = :status', { status });
    if (keyword) {
      qb.leftJoin('factors', 'f', 'f.id = e.factor_id')
        .leftJoin('organizations', 'o', 'o.id = e.org_id')
        .andWhere(
          '(e.id ILIKE :kw OR e.factor_id ILIKE :kw OR f.name ILIKE :kw OR o.name ILIKE :kw OR o.code ILIKE :kw OR e.remark ILIKE :kw)',
          { kw: `%${keyword}%` },
        );
    }

    qb.orderBy('e.period', 'DESC').addOrderBy('e.created_at', 'DESC');

    const [list, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();

    const orgIds = [...new Set(list.map((e) => e.orgId))];
    const orgs = orgIds.length ? await this.orgRepo.findByIds(orgIds) : [];
    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    const factorIds = [...new Set(list.map((e) => e.factorId))];
    const factors = factorIds.length ? await this.factorRepo.findByIds(factorIds) : [];
    const factorMap = new Map(factors.map((f) => [f.id, f]));

    return {
      list: list.map((e) => ({
        ...e,
        orgName: orgMap.get(e.orgId)?.name || '',
        orgCode: orgMap.get(e.orgId)?.code || '',
        factorName: factorMap.get(e.factorId)?.name || '',
        createBy: e.createdBy,
        createDate: e.createdAt?.toISOString().replace('T', ' ').substring(0, 19),
        updateBy: e.updatedBy,
        updateDate: e.updatedAt?.toISOString().replace('T', ' ').substring(0, 19),
      })),
      total,
      page: +page,
      pageSize: +pageSize,
    };
  }

  async getById(id: string) {
    const e = await this.repo.findOne({ where: { id } });
    if (!e) throw new NotFoundException();
    const org = await this.orgRepo.findOne({ where: { id: e.orgId } });
    const factor = await this.factorRepo.findOne({ where: { id: e.factorId } });
    return {
      ...e,
      orgName: org?.name || '',
      orgCode: org?.code || '',
      factorName: factor?.name || '',
    };
  }

  private nextEntryId = 0;

  private async getNextEntryId(): Promise<string> {
    const max = await this.repo
      .createQueryBuilder('e')
      .select('MAX(e.id)', 'max')
      .getRawOne();
    let next = 1;
    if (max?.max) {
      const match = max.max.match(/^E(\d+)$/);
      if (match) next = parseInt(match[1]) + 1;
    }
    return `E${String(next).padStart(6, '0')}`;
  }

  async create(dto: any, userId: string) {
    const factor = await this.factorRepo.findOne({ where: { id: dto.factorId, status: 'enabled' } });
    if (!factor) throw new BadRequestException('排放因子不存在或已停用');

    const org = await this.orgRepo.findOne({ where: { id: dto.orgId } });
    if (!org) throw new BadRequestException('组织不存在');

    if (!dto.quantity || dto.quantity <= 0 || dto.quantity >= 1e8) {
      throw new BadRequestException('活动数据必须大于 0 且小于 1亿');
    }

    const existing = await this.repo.findOne({
      where: { orgId: dto.orgId, period: dto.period, factorId: dto.factorId },
    });
    if (existing) throw new ConflictException('同组织同周期同因子的填报记录已存在');

    const emission = +(dto.quantity * factor.value).toFixed(4);
    const scope = CATEGORY_SCOPE[factor.categoryCode] || 1;
    const id = await this.getNextEntryId();

    const entry = this.repo.create({
      id,
      orgId: dto.orgId,
      period: dto.period,
      periodType: 'month',
      categoryCode: factor.categoryCode,
      factorId: factor.id,
      quantity: dto.quantity,
      unit: dto.unit || factor.unit,
      factorValue: factor.value,
      factorUnit: factor.unit,
      scope,
      emission,
      source: 'manual',
      status: dto.status || 'draft',
      createdBy: userId,
      updatedBy: userId,
    });

    return this.repo.save(entry);
  }

  async update(id: string, dto: any, userId: string) {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException();
    if (entry.status === 'approved') throw new BadRequestException('已审核的记录不可修改');

    if (dto.quantity) {
      entry.quantity = dto.quantity;
      entry.emission = +(dto.quantity * entry.factorValue).toFixed(4);
    }
    if (dto.status) entry.status = dto.status;
    if (dto.remark) entry.remark = dto.remark;
    entry.updatedBy = userId;

    return this.repo.save(entry);
  }

  async remove(id: string, userId: string) {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException();
    if (entry.status === 'approved') throw new BadRequestException('已审核的记录不可删除');
    await this.repo.delete(id);
    return null;
  }

  async submit(id: string, userId: string) {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException();
    entry.status = 'submitted';
    entry.submitAt = new Date();
    entry.updatedBy = userId;
    return this.repo.save(entry);
  }

  async approve(id: string, userId: string) {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException();
    entry.status = 'approved';
    entry.approveAt = new Date();
    entry.approveBy = userId;
    entry.updatedBy = userId;
    return this.repo.save(entry);
  }

  async reject(id: string, reason: string, userId: string) {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException();
    entry.status = 'rejected';
    entry.rejectReason = reason;
    entry.updatedBy = userId;
    return this.repo.save(entry);
  }

  async importEntries(file: Express.Multer.File, options: any, userId: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const sheet = workbook.worksheets[0];

    let total = 0, success = 0, failed = 0, skipped = 0;
    const errorRows: any[] = [];
    const toInsert: Entry[] = [];

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const orgCode = row.getCell(1).text?.trim();
      const period = row.getCell(2).text?.trim();
      const factorId = row.getCell(3).text?.trim();
      const qtyText = row.getCell(4).text?.trim();

      if (!orgCode && !period && !factorId) continue;
      total++;

      try {
        if (!orgCode) throw { col: 'A (组织编码)', reason: '必填列为空' };
        if (!period) throw { col: 'B (报告期)', reason: '必填列为空' };
        if (!factorId) throw { col: 'C (排放因子编码)', reason: '必填列为空' };
        if (!qtyText) throw { col: 'D (活动数据)', reason: '必填列为空' };
        if (!/^\d{4}-\d{2}$/.test(period)) throw { col: 'B (报告期)', reason: '报告期格式应为 YYYY-MM' };

        const qty = parseFloat(qtyText);
        if (isNaN(qty) || qty <= 0) throw { col: 'D (活动数据)', reason: '活动数据必须是正数' };
        if (qty >= 1e8) throw { col: 'D (活动数据)', reason: '数值超出上限 1亿' };

        const org = await this.orgRepo.findOne({ where: { code: orgCode, deletedAt: null } });
        if (!org) throw { col: 'A (组织编码)', reason: `组织编码 ${orgCode} 不存在` };

        const factor = await this.factorRepo.findOne({ where: { id: factorId } });
        if (!factor) throw { col: 'C (排放因子编码)', reason: `排放因子编码 ${factorId} 不存在` };
        if (factor.status !== 'enabled') throw { col: 'C (排放因子编码)', reason: '排放因子已停用' };

        const existing = await this.repo.findOne({
          where: { orgId: org.id, period, factorId },
        });

        if (existing) {
          if (options.conflictPolicy === 'skip') { skipped++; continue; }
          if (options.conflictPolicy === 'error') throw { col: 'B (报告期)', reason: '记录已存在（冲突策略：error）' };
          // update
          existing.quantity = qty;
          existing.emission = +(qty * factor.value).toFixed(4);
          existing.updatedBy = userId;
          await this.repo.save(existing);
          success++;
          continue;
        }

        const scope = CATEGORY_SCOPE[factor.categoryCode] || 1;
        const entry = this.repo.create({
          id: 'PLACEHOLDER',
          orgId: org.id,
          period,
          periodType: 'month',
          categoryCode: factor.categoryCode,
          factorId: factor.id,
          quantity: qty,
          unit: factor.unit,
          factorValue: factor.value,
          factorUnit: factor.unit,
          scope,
          emission: +(qty * factor.value).toFixed(4),
          source: 'import',
          status: options.importStatus || 'draft',
          createdBy: userId,
          updatedBy: userId,
        });
        toInsert.push(entry);
        success++;
      } catch (err: any) {
        failed++;
        errorRows.push({
          row: rowNum,
          org: row.getCell(1).text?.trim(),
          factor: row.getCell(3).text?.trim(),
          col: err.col || '',
          reason: err.reason || String(err),
        });
      }
    }

    if (toInsert.length) {
      // Assign sequential IDs to avoid collision
      const maxEntry = await this.repo.createQueryBuilder('e').select('MAX(e.id)', 'max').getRawOne();
      let nextNum = 1;
      if (maxEntry?.max) {
        const match = maxEntry.max.match(/^E(\d+)$/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      toInsert.forEach((entry) => {
        entry.id = `E${String(nextNum++).padStart(6, '0')}`;
      });
      await this.repo.save(toInsert);
    }

    return { total, success, failed, skipped, errorRows };
  }

  async exportEntries(query: any, res: any) {
    const data = await this.getList({ ...query, page: 1, pageSize: 10000 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('填报数据');
    sheet.addRow(['编号', '组织', '报告期', '类别', '因子', '活动数据', '单位', '排放量(tCO2e)', '范围', '状态']);
    data.list.forEach((e: any) => {
      sheet.addRow([e.id, e.orgName, e.period, e.categoryCode, e.factorName, e.quantity, e.unit, e.emission, e.scope, e.status]);
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=entries.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }
}
