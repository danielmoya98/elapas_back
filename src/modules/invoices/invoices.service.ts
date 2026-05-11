import { Injectable } from '@nestjs/common';
import { PrismaInvoiceRepository } from './infrastructure/repositories/prisma-invoice.repository';

@Injectable()
export class InvoicesService {
  constructor(private readonly invoicesRepository: PrismaInvoiceRepository) { }

  async findAll(page = 1, limit = 10) {
    const result = await this.invoicesRepository.findAll({ page, limit });

    const mappedData = result.data.map(invoice => {
      const date = new Date(invoice.createdAt);
      const periodName = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      const monthPrefix = (date.getMonth() + 1).toString().padStart(2, '0');
      const yearPrefix = date.getFullYear().toString().slice(-2);

      const statusMap = {
        PENDIENTE: 'Pendiente',
        PAGADO: 'Pagado',
        VENCIDO: 'Vencido'
      };

      return {
        id: invoice.id,
        invoiceCode: `FAC-${monthPrefix}${yearPrefix}-${invoice.id.slice(-5).toUpperCase()}`,
        customer: invoice.customer.fullName,
        customerCode: `C-${invoice.customer.ci}`,
        period: periodName.charAt(0).toUpperCase() + periodName.slice(1),
        consumption: invoice.consumption.toString(),
        amount: invoice.total.toFixed(2),
        issueDate: invoice.createdAt.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        status: statusMap[invoice.status]
      };
    });

    return { data: mappedData, meta: result.meta };
  }
}
