import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as ExcelJS from 'exceljs';
import { Factor } from './factor.entity';

@Injectable()
export class FactorsService {
  constructor(@InjectRepository(Factor) private repo: Repository<Factor>) {}

  async getList(query: any) {
    const { industry, category, standard, status, keyword, page = 1, pageSize = 10 } = query;
    const qb = this.repo.createQueryBuilder('f');

    if (industry) {
      const vals = String(industry).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) qb.andWhere('f.industry_code = :industry', { industry: vals[0] });
      else if (vals.length > 1) qb.andWhere('f.industry_code IN (:...industries)', { industries: vals });
    }
    if (category) {
      const vals = String(category).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) qb.andWhere('f.category_code = :category', { category: vals[0] });
      else if (vals.length > 1) qb.andWhere('f.category_code IN (:...categories)', { categories: vals });
    }
    if (standard) qb.andWhere('f.standard = :standard', { standard });
    if (status) {
      const vals = String(status).split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length === 1) qb.andWhere('f.status = :status', { status: vals[0] });
      else if (vals.length > 1) qb.andWhere('f.status IN (:...statuses)', { statuses: vals });
    }
    if (keyword) qb.andWhere('f.name ILIKE :kw', { kw: `%${keyword}%` });

    qb.orderBy('f.effective_date', 'DESC').addOrderBy('f.id', 'ASC');

    const [list, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async getById(id: string) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException();
    return f;
  }

  async getHistory(id: string) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException();
    return this.repo.find({
      where: { lineageId: f.lineageId },
      order: { effectiveDate: 'DESC' },
    });
  }

  async getRecommended(query: any) {
    const { industryCode, categoryCode } = query;
    const qb = this.repo.createQueryBuilder('f').where('f.status = :s', { s: 'enabled' });
    if (categoryCode) qb.andWhere('f.category_code = :c', { c: categoryCode });

    // Prefer industry-specific factors for the org's industry, fall back to GENERAL
    if (industryCode && industryCode !== 'GENERAL') {
      qb.andWhere('(f.industry_code = :ind OR f.industry_code = :gen)', { ind: industryCode, gen: 'GENERAL' });
      qb.orderBy(`CASE WHEN f.industry_code = '${industryCode}' THEN 0 ELSE 1 END`, 'ASC');
    } else {
      qb.orderBy(`CASE WHEN f.scope_type = 'industry' THEN 0 ELSE 1 END`, 'ASC');
    }
    qb.addOrderBy('f.effective_date', 'DESC');
    return qb.limit(50).getMany();
  }

  async create(dto: any, userId: string) {
    const maxId = await this.repo
      .createQueryBuilder('f')
      .select('MAX(f.id)', 'max')
      .getRawOne();

    let nextNum = 21;
    if (maxId?.max) {
      const match = maxId.max.match(/^F(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const id = `F${String(nextNum).padStart(3, '0')}`;
    const lineageId = dto.lineageId || uuidv4();

    const factor = this.repo.create({
      id,
      lineageId,
      name: dto.name,
      categoryCode: dto.categoryCode,
      industryCode: dto.industryCode || 'GENERAL',
      value: dto.value,
      unit: dto.unit,
      source: dto.source,
      version: dto.version,
      effectiveDate: dto.effectiveDate,
      standard: dto.standard || 'ISO',
      scopeType: dto.scopeType || 'general',
      status: 'enabled',
      createdBy: userId,
      updatedBy: userId,
    });

    return this.repo.save(factor);
  }

  async update(id: string, dto: any, userId: string) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException();
    Object.assign(f, { ...dto, updatedBy: userId });
    return this.repo.save(f);
  }

  async updateStatus(id: string, status: string, userId: string) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException();
    f.status = status;
    f.updatedBy = userId;
    return this.repo.save(f);
  }

  async remove(id: string) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException();
    await this.repo.delete(id);
    return null;
  }

  async importFactors(file: Express.Multer.File, userId: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const sheet = workbook.worksheets[0];

    const VALID_CATEGORIES = ['FUEL', 'PROCESS', 'FUGITIVE', 'ELEC', 'HEAT', 'TRANSPORT', 'WASTE', 'BUSINESS'];

    // Get current max ID for sequential numbering
    const maxId = await this.repo.createQueryBuilder('f').select('MAX(f.id)', 'max').getRawOne();
    let nextNum = 21;
    if (maxId?.max) {
      const match = maxId.max.match(/^F(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    let total = 0, success = 0, failed = 0;
    const errorRows: any[] = [];
    const toInsert: Factor[] = [];

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const name = row.getCell(1).text?.trim();
      const categoryCode = row.getCell(2).text?.trim();
      const valueText = row.getCell(3).text?.trim();
      const unit = row.getCell(4).text?.trim();
      const source = row.getCell(5).text?.trim();
      const version = row.getCell(6).text?.trim();
      const effectiveDate = row.getCell(7).text?.trim();
      const industryCode = row.getCell(8).text?.trim() || 'GENERAL';
      const standard = row.getCell(9).text?.trim() || 'ISO';

      if (!name && !categoryCode && !valueText) continue;
      total++;

      try {
        if (!name) throw new Error('A列(因子名称)不能为空');
        if (!categoryCode) throw new Error('B列(类别编码)不能为空');
        if (!VALID_CATEGORIES.includes(categoryCode)) throw new Error(`B列类别编码无效，应为: ${VALID_CATEGORIES.join('/')}`);
        if (!valueText) throw new Error('C列(因子值)不能为空');
        const value = parseFloat(valueText);
        if (isNaN(value) || value <= 0) throw new Error('C列(因子值)必须是正数');
        if (!unit) throw new Error('D列(单位)不能为空');
        if (!source) throw new Error('E列(数据来源)不能为空');
        if (!version) throw new Error('F列(版本号)不能为空');
        if (!effectiveDate) throw new Error('G列(生效日期)不能为空');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) throw new Error('G列日期格式应为 YYYY-MM-DD');

        const id = `F${String(nextNum++).padStart(3, '0')}`;
        const factor = this.repo.create({
          id,
          lineageId: uuidv4(),
          name,
          categoryCode,
          industryCode,
          value,
          unit,
          source,
          version,
          effectiveDate,
          standard,
          scopeType: industryCode === 'GENERAL' ? 'general' : 'industry',
          status: 'enabled',
          createdBy: userId,
          updatedBy: userId,
        });
        toInsert.push(factor);
        success++;
      } catch (e: any) {
        failed++;
        errorRows.push({ row: rowNumber, name: name || '', reason: e.message });
      }
    }

    if (toInsert.length) {
      await this.repo.save(toInsert);
    }

    return { total, success, failed, errorRows };
  }

  async exportFactors(query: any, res: any) {
    const factors = await this.repo.find({ order: { id: 'ASC' } });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('排放因子');
    sheet.addRow(['编码', '名称', '类别', '行业', '因子值', '单位', '来源', '版本', '生效日期', '状态']);
    factors.forEach((f) => {
      sheet.addRow([f.id, f.name, f.categoryCode, f.industryCode, f.value, f.unit, f.source, f.version, f.effectiveDate, f.status]);
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=factors.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }
}
