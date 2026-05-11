import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller';

import { PaymentsService } from './payments.service';

import { PrismaPaymentRepository } from './infrastructure/repositories/prisma-payment.repository';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [PaymentsController],
  imports: [DashboardModule, AuditModule, NotificationsModule],
  providers: [
    PaymentsService,
    PrismaPaymentRepository,
  ],
})
export class PaymentsModule { }
