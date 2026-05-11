import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async findTechnicians() {
    return this.prisma.user.findMany({
      where: {
        role: 'TECNICO',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, avatarUrl: true, role: true }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        email: dto.email,
        avatarUrl: dto.avatarUrl,
      },
      select: { id: true, email: true, fullName: true, avatarUrl: true, role: true }
    });
  }

  // --- NUEVAS FUNCIONES PARA EL MÓDULO DE ADMINISTRACIÓN ---

  async findAllUsers(role?: string, status?: string) {
    const whereClause: any = {};

    if (role) whereClause.role = role;
    if (status === 'active') whereClause.isActive = true;
    if (status === 'suspended') whereClause.isActive = false;

    return this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        districts: { select: { id: true, name: true } } // Zonas asignadas
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createUserAdmin(dto: AdminCreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('El correo ya está en uso');

    // Genera contraseña temporal: Ej. Elapas2026!
    const tempPassword = `Elapas${new Date().getFullYear()}!`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        role: dto.role,
        password: hashedPassword,
        districts: dto.districtIds ? { connect: dto.districtIds.map(id => ({ id })) } : undefined
      },
      select: { id: true, email: true, fullName: true, role: true }
    });

    // 🔥 MODIFICADO: Ahora devolvemos la contraseña temporal
    return {
      message: 'Usuario creado exitosamente',
      user,
      tempPassword
    };
  }

  async toggleStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true }
    });
  }

  async assignDistricts(userId: string, districtIds: string[]) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        districts: {
          set: [], // Desconecta anteriores
          connect: districtIds.map(id => ({ id })) // Conecta nuevos
        }
      }
    });
  }

  async adminResetPassword(userId: string) {
    const tempPassword = `Reset${new Date().getFullYear()}!`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return { message: 'Contraseña reseteada', tempPassword };
  }

  // ... tus otros métodos

  async updateFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
    return { message: 'Token actualizado' };
  }
}
