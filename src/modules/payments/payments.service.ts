import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './application/dto/create-payment.dto';
import { DashboardGateway } from '../../infrastructure/websocket/gateways/dashboard.gateway';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaPaymentRepository } from './infrastructure/repositories/prisma-payment.repository';
// 👇 Importa tu servicio de notificaciones (Ajusta la ruta según tu estructura)
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardGateway: DashboardGateway,
    private readonly auditService: AuditService,
    private readonly paymentsRepository: PrismaPaymentRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly notificationsService: NotificationsService, // <-- NUEVO
  ) { }

  async create(dto: CreatePaymentDto, userId: string) {
    // Incluimos al cliente para poder notificarle
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { customer: true } // <-- NUEVO
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'PAGADO') {
      throw new BadRequestException('Invoice already paid');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          invoiceId: dto.invoiceId,
          userId,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
        },
      });

      const paymentsAggregate = await tx.payment.aggregate({
        where: { invoiceId: dto.invoiceId },
        _sum: { amount: true },
      });

      const totalPaid = paymentsAggregate._sum.amount || 0;

      if (totalPaid >= invoice.total) {
        await tx.invoice.update({
          where: { id: dto.invoiceId },
          data: { status: 'PAGADO' },
        });
      }

      return createdPayment;
    });

    await this.cacheManager.del('dashboard:stats');

    this.dashboardGateway.emitPaymentCreated({
      paymentId: payment.id,
      amount: payment.amount,
    });

    await this.auditService.log({
      entity: 'PAYMENT',
      entityId: payment.id,
      action: 'CREATE',
      newData: payment,
    });

    // 🔥 NUEVO: Disparamos la notificación al Cliente
    if (invoice.customer && invoice.customer.userId) {
      await this.notificationsService.createNotification({
        userId: invoice.customer.userId,
        title: 'Pago Recibido',
        message: `Hemos recibido tu pago de Bs ${dto.amount} exitosamente. ¡Gracias!`,
        type: 'payment',
      });
    }

    return payment;
  }

  async findAll(page = 1, limit = 10) {
    const result = await this.paymentsRepository.findAll({ page, limit });

    const mappedData = result.data.map(payment => {
      const methodMap: Record<string, string> = {
        EFECTIVO: 'Efectivo',
        QR: 'QR Simple',
        TRANSFERENCIA: 'Transferencia',
      };

      const customerName = payment.invoice?.customer?.fullName || 'Desconocido';
      const customerCode = payment.invoice?.customer?.ci ? `C-${payment.invoice.customer.ci}` : 'N/A';

      return {
        id: payment.id,
        receiptCode: `REC-${payment.id.slice(-5).toUpperCase()}`,
        customer: customerName,
        customerCode: customerCode,
        amount: payment.amount.toFixed(2),
        method: methodMap[payment.method] || 'Efectivo',
        date: payment.createdAt.toISOString().replace('T', ' ').slice(0, 16),
        status: 'Completado',
        cashier: payment.user.email.split('@')[0],
      };
    });

    return { data: mappedData, meta: result.meta };
  }
}
