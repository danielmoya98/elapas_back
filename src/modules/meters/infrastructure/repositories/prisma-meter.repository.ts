import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MeterRepository, PaginatedMetersResult } from '../../domain/repositories/meter.repository';

@Injectable()
export class PrismaMeterRepository implements MeterRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(data: any) {
    return this.prisma.meter.create({
      data,
      include: {
        customer: true,
      },
    });
  }

  // Agregamos el $transaction para la paginación
  async findAll(params: { page: number; limit: number }): Promise<PaginatedMetersResult> {
    const { page, limit } = params;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.meter.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { deletedAt: null },
        include: {
          customer: {
            include: {
              district: true,
            },
          },
          readings: {
            take: 1, // Traemos solo la lectura más reciente
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.meter.count({ where: { deletedAt: null } })
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findByCode(code: string) {
    return this.prisma.meter.findUnique({
      where: { code },
    });
  }

  async findById(id: string) {
    return this.prisma.meter.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.meter.update({
      where: { id },
      data,
    });
  }
}
