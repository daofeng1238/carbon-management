import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Organization } from './organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization) private repo: Repository<Organization>,
  ) {}

  async getTree(depthLimit = 4): Promise<any> {
    const orgs = await this.repo
      .createQueryBuilder('o')
      .where('o.deleted_at IS NULL')
      .orderBy('o.level', 'ASC')
      .addOrderBy('o.code', 'ASC')
      .getMany();

    const map = new Map<string, any>();
    orgs.forEach((o) => map.set(o.id, { ...o, children: [] }));

    let root: any = null;
    orgs.forEach((o) => {
      const node = map.get(o.id);
      if (o.parentId && map.has(o.parentId) && o.level <= depthLimit) {
        map.get(o.parentId).children.push(node);
      } else if (!o.parentId) {
        root = node;
      }
    });
    return root;
  }

  async getList(query: any) {
    const { keyword, industry, parentId, page = 1, pageSize = 20 } = query;
    const qb = this.repo
      .createQueryBuilder('o')
      .where('o.deleted_at IS NULL');

    if (keyword) qb.andWhere('(o.name ILIKE :kw OR o.code ILIKE :kw)', { kw: `%${keyword}%` });
    if (industry) qb.andWhere('o.industry_code = :industry', { industry });
    if (parentId) qb.andWhere('o.parent_id = :parentId', { parentId });

    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const parentIds = [...new Set(list.filter((o) => o.parentId).map((o) => o.parentId))];
    const parents = parentIds.length
      ? await this.repo.findByIds(parentIds)
      : [];
    const parentMap = new Map(parents.map((p) => [p.id, p.name]));

    return {
      list: list.map((o) => ({ ...o, parentName: parentMap.get(o.parentId) || null })),
      total,
      page: +page,
      pageSize: +pageSize,
    };
  }

  async getById(id: string) {
    const org = await this.repo.findOne({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException('组织不存在');

    const ancestors = await this.repo
      .createQueryBuilder('o')
      .where(`:orgPath LIKE o.path || '.%' OR o.path = :orgPath`, { orgPath: org.path })
      .andWhere('o.deleted_at IS NULL')
      .orderBy('o.level', 'ASC')
      .getMany();

    const descendantCount = await this.repo
      .createQueryBuilder('o')
      .where(`o.path LIKE :prefix`, { prefix: org.path + '.%' })
      .andWhere('o.deleted_at IS NULL')
      .getCount();

    const parent = org.parentId
      ? await this.repo.findOne({ where: { id: org.parentId } })
      : null;

    return {
      ...org,
      parentName: parent?.name || null,
      path: ancestors.map((a) => ({ id: a.id, name: a.name, level: a.level })),
      descendantCount,
    };
  }

  async getDescendants(id: string) {
    const org = await this.repo.findOne({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException();
    return this.repo
      .createQueryBuilder('o')
      .where(`(o.path = :path OR o.path LIKE :prefix)`, { path: org.path, prefix: org.path + '.%' })
      .andWhere('o.deleted_at IS NULL')
      .getMany();
  }

  async getChildren(id: string) {
    return this.repo.find({ where: { parentId: id, deletedAt: null } });
  }

  async create(dto: any, userId: string) {
    const exists = await this.repo.findOne({ where: { code: dto.code, deletedAt: null } });
    if (exists) throw new ConflictException({ data: { field: 'code', rule: 'unique' }, message: `组织编码 ${dto.code} 已存在` });

    if (!/^[A-Za-z0-9-]+$/.test(dto.code)) {
      throw new BadRequestException({ data: { field: 'code', rule: 'pattern' }, message: '组织编码只能包含字母、数字和连字符' });
    }

    let level = 1;
    let path = '';

    if (dto.parentId) {
      const parent = await this.repo.findOne({ where: { id: dto.parentId, deletedAt: null } });
      if (!parent) throw new BadRequestException('父组织不存在');
      level = parent.level + 1;
      if (level > 4) throw new BadRequestException('组织层级不能超过 4 级');
      const id = uuidv4().replace(/-/g, '').substring(0, 8);
      path = parent.path + '.' + id;
    } else {
      const id = uuidv4().replace(/-/g, '').substring(0, 8);
      path = id;
    }

    const id = uuidv4();
    const org = this.repo.create({
      id,
      code: dto.code,
      name: dto.name,
      parentId: dto.parentId || null,
      industryCode: dto.industry || dto.industryCode || 'GENERAL',
      standard: dto.standard,
      address: dto.address,
      employees: dto.employees,
      level,
      path,
      status: 'active',
      createdBy: userId,
      updatedBy: userId,
    });

    return this.repo.save(org);
  }

  async update(id: string, dto: any, userId: string) {
    const org = await this.repo.findOne({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException();

    Object.assign(org, {
      name: dto.name ?? org.name,
      industryCode: dto.industry ?? dto.industryCode ?? org.industryCode,
      standard: dto.standard ?? org.standard,
      address: dto.address ?? org.address,
      employees: dto.employees ?? org.employees,
      updatedBy: userId,
    });

    return this.repo.save(org);
  }

  async moveOrg(id: string, newParentId: string, userId: string) {
    const org = await this.repo.findOne({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException('组织不存在');
    if (org.level === 1) throw new BadRequestException('集团根节点不可移动');

    const newParent = await this.repo.findOne({ where: { id: newParentId, deletedAt: null } });
    if (!newParent) throw new BadRequestException('目标父组织不存在');

    const newLevel = newParent.level + 1;
    if (newLevel > 4) throw new BadRequestException('移动后层级超过4级限制');

    // Prevent moving into own descendant
    if (newParent.path.startsWith(org.path + '.') || newParent.id === org.id) {
      throw new BadRequestException('不能移动到自身或自身的下属组织');
    }

    const oldPath = org.path;
    const pathSegment = org.path.split('.').pop();
    const newPath = newParent.path + '.' + pathSegment;
    const levelDelta = newLevel - org.level;

    // Update this org
    org.parentId = newParentId;
    org.level = newLevel;
    org.path = newPath;
    org.updatedBy = userId;
    await this.repo.save(org);

    // Update all descendants' path and level
    const descendants = await this.repo
      .createQueryBuilder('o')
      .where(`o.path LIKE :prefix`, { prefix: oldPath + '.%' })
      .andWhere('o.deleted_at IS NULL')
      .getMany();

    for (const d of descendants) {
      d.path = newPath + d.path.substring(oldPath.length);
      d.level = d.level + levelDelta;
      d.updatedBy = userId;
    }
    if (descendants.length) await this.repo.save(descendants);

    return { moved: descendants.length + 1, newPath, newLevel };
  }

  async remove(id: string, cascade: boolean, userId: string) {
    const org = await this.repo.findOne({ where: { id, deletedAt: null } });
    if (!org) throw new NotFoundException();
    if (org.level === 1) throw new BadRequestException('集团根节点不可删除');

    const descendants = await this.repo
      .createQueryBuilder('o')
      .where(`(o.path = :path OR o.path LIKE :prefix)`, { path: org.path, prefix: org.path + '.%' })
      .andWhere('o.deleted_at IS NULL')
      .getMany();

    const now = new Date();
    for (const d of descendants) {
      await this.repo.update(d.id, { deletedAt: now, updatedBy: userId });
    }
    return { deleted: descendants.length };
  }
}
