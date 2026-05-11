import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../prisma/prisma.service';

import { DistrictRepository } from '../../domain/repositories/district.repository';

@Injectable()
export class PrismaDistrictRepository
  implements DistrictRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(data: any) {
    return this.prisma.district.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.district.findMany({
      include: {
        _count: {
          select: {
            customers: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.district.findUnique({
      where: {
        name,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.district.update({
      where: {
        id,
      },

      data,
    });
  }

  async delete(id: string) {
    return this.prisma.district.delete({
      where: {
        id,
      },
    });
  }
}
