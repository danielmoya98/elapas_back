import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PrismaInvoiceRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(params: { page: number; limit: number }) {
    const { page, limit } = params;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: true,
          reading: {
            include: { meter: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count()
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findById(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, reading: { include: { meter: true } } }
    });
  }
}
