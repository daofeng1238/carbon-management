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

    if (industry) qb.andWhere('f.industry_code = :industry', { industry });
    if (category) qb.andWhere('f.category_code = :category', { category });
    if (standard) qb.andWhere('f.standard = :standard', { standard });
    if (status) qb.andWhere('f.status = :status', { status });
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
    const { orgId, categoryCode } = query;
    const qb = this.repo.createQueryBuilder('f').where('f.status = :s', { s: 'enabled' });
    if (categoryCode) qb.andWhere('f.category_code = :c', { c: categoryCode });
    qb.orderBy(`CASE WHEN f.scope_type = 'industry' THEN 0 ELSE 1 END`, 'ASC')
      .addOrderBy('f.effective_date', 'DESC');
    return qb.limit(20).getMany();
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

    let total = 0, success = 0, failed = 0;
    const errorRows: any[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      total++;
      try {
        const name = row.getCell(1).text?.trim();
        const categoryCode = row.getCell(2).text?.trim();
        const value = parseFloat(row.getCell(3).text);
        const unit = row.getCell(4).text?.trim();
        const source = row.getCell(5).text?.trim();
        const version = row.getCell(6).text?.trim();
        const effectiveDate = row.getCell(7).text?.trim();

        if (!name || !categoryCode || !unit || !source || !version || !effectiveDate || isNaN(value) || value <= 0) {
          throw new Error('必填列为空或数值无效');
        }
        success++;
      } catch (e) {
        failed++;
        errorRows.push({ row: rowNumber, reason: e.message });
      }
    });

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
