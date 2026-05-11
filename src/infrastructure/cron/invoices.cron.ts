import { Injectable } from '@nestjs/common';

import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoicesCron {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  @Cron('0 0 * * *')
  async markExpiredInvoices() {
    await this.prisma.invoice.updateMany({
      where: {
        dueDate: {
          lt: new Date(),
        },

        status: 'PENDIENTE',
      },

      data: {
        status: 'VENCIDO',
      },
    });

    console.log(
      'Expired invoices updated',
    );
  }
}
