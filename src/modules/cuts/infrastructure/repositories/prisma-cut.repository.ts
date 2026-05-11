import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CutRepository, PaginatedCutsResult } from '../../domain/repositories/cut.repository';

@Injectable()
export class PrismaCutRepository implements CutRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(data: any) {
    return this.prisma.serviceCut.create({ data, include: { customer: true } });
  }

  async findAll(params: { page: number; limit: number }): Promise<PaginatedCutsResult> {
    const { page, limit } = params;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.serviceCut.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: {
            include: { invoices: { where: { status: 'VENCIDO' } } }
          },
          technician: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceCut.count()
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ... findById y update (se mantienen igual que los tenías)
  async findById(id: string) { return this.prisma.serviceCut.findUnique({ where: { id } }); }
  async update(id: string, data: any) { return this.prisma.serviceCut.update({ where: { id }, data }); }
}
