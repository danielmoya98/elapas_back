import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PaymentRepository, PaginatedPaymentsResult } from '../../domain/repositories/payment.repository';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(data: any) {
    return this.prisma.payment.create({
      data,
      include: {
        invoice: true,
        user: true,
      },
    });
  }

  async findAll(params: { page: number; limit: number }): Promise<PaginatedPaymentsResult> {
    const { page, limit } = params;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          invoice: {
            include: {
              customer: true, // Traemos al cliente dueño de la factura
            },
          },
          user: true, // Cajero
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.payment.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getInvoicePaymentsTotal(invoiceId: string) {
    const result = await this.prisma.payment.aggregate({
      where: {
        invoiceId,
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }
}
