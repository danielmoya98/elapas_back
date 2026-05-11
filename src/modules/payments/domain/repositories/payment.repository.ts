import { Payment } from '../../../../../prisma/generated/client';

export interface PaginatedPaymentsResult {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export abstract class PaymentRepository {
  abstract create(data: any): Promise<Payment>;

  abstract findAll(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedPaymentsResult>;

  abstract getInvoicePaymentsTotal(
    invoiceId: string,
  ): Promise<number>;
}
