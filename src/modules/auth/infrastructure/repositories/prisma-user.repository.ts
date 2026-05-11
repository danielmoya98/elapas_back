import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../../src/prisma/prisma.service';

import { UserRepository } from '../../domain/repositories/user.repository';

@Injectable()
export class PrismaUserRepository
  implements UserRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async create(data: {
    email: string;
    password: string;
    role: any;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // ESTE ES EL MÉTODO QUE FALTA Y CAUSA EL ERROR
  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
