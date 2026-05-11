import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CustomerRepository } from '../../domain/repositories/customer.repository';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(data: any) {
    return this.prisma.customerProfile.create({
      data,
      include: {
        user: true,
        district: true,
      },
    });
  }

  async findAll(params: { page: number; limit: number }) {
    const { page, limit } = params;

    // Ejecutamos la consulta y el conteo en paralelo
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customerProfile.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { deletedAt: null },
        include: {
          user: { select: { email: true, isActive: true } },
          district: true,
          // Traemos facturas pendientes/vencidas para sumar la deuda
          invoices: { where: { status: { in: ['PENDIENTE', 'VENCIDO'] } } },
          // Traemos el último corte para saber si está suspendido
          cuts: { orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customerProfile.count({ where: { deletedAt: null } })
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findByCi(ci: string) {
    return this.prisma.customerProfile.findUnique({
      where: { ci },
    });
  }
}
