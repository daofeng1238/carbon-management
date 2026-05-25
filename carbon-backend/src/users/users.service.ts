import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserOrgRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserOrgRole) private roleRepo: Repository<UserOrgRole>,
  ) {}

  async getList() {
    return this.userRepo.find({ where: { status: 'active' } });
  }

  async create(dto: any) {
    const hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      id: uuidv4(),
      username: dto.username,
      name: dto.name,
      email: dto.email,
      passwordHash: hash,
      status: 'active',
    });
    return this.userRepo.save(user);
  }

  async update(id: string, dto: any) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async assignRole(id: string, dto: { orgId: string; roleCode: string }) {
    const role = this.roleRepo.create({ id: uuidv4(), userId: id, ...dto });
    return this.roleRepo.save(role);
  }
}
