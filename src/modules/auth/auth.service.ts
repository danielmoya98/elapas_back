import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { RegisterDto } from './application/dto/register.dto';
import { LoginDto } from './application/dto/login.dto';
import { UpdatePasswordDto } from './application/dto/update-password.dto';

import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { AuditService } from '../../infrastructure/audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: PrismaUserRepository,
    private readonly auditService: AuditService,
  ) { }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.usersRepository.create({
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
    });

    await this.auditService.log({
      userId: user.id,
      entity: 'AUTH',
      entityId: user.id,
      action: 'REGISTER',
      newData: { email: user.email, role: user.role },
    });

    return {
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.auditService.log({
      userId: user.id,
      entity: 'AUTH',
      entityId: user.id,
      action: 'LOGIN',
      newData: { email: user.email, role: user.role },
    });

    // 🔥 NUEVO: Actualizamos la última conexión del usuario 🔥
    await this.usersRepository.update(user.id, { lastLoginAt: new Date() });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }
    };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.usersRepository.update(userId, { password: hashedNewPassword });

    await this.auditService.log({
      userId: user.id,
      entity: 'USER_SECURITY',
      entityId: user.id,
      action: 'UPDATE_PASSWORD',
    });

    return { message: 'Contraseña actualizada con éxito' };
  }
}
