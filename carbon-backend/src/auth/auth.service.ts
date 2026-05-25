import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserOrgRole } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserOrgRole) private roleRepo: Repository<UserOrgRole>,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({ where: { username, status: 'active' } });
    if (!user) throw new UnauthorizedException('用户名或密码错误');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('用户名或密码错误');

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const roles = await this.roleRepo.find({ where: { userId: user.id } });
    const orgScope = roles.map((r) => r.orgId);

    const payload = { sub: user.id, username: user.username };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        roles: roles.map((r) => ({ orgId: r.orgId, roleCode: r.roleCode })),
        orgScope,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const roles = await this.roleRepo.find({ where: { userId: user.id } });
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      roles: roles.map((r) => ({ orgId: r.orgId, roleCode: r.roleCode })),
      orgScope: roles.map((r) => r.orgId),
    };
  }
}
