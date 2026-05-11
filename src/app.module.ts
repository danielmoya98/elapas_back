import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DistrictsModule } from './modules/districts/districts.module';
import { MetersModule } from './modules/meters/meters.module';
import { ReadingsModule } from './modules/readings/readings.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CutsModule } from './modules/cuts/cuts.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { InvoicesCron } from './infrastructure/cron/invoices.cron';
import { NotificationsModule } from './modules/notifications/notifications.module'; // <-- Añadir esto
import { ScheduleModule } from '@nestjs/schedule';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';

import { RedisModule } from './infrastructure/redis/redis.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AuditModule } from './infrastructure/audit/audit.module';
@Module({

  imports: [
    RedisModule,

    ScheduleModule.forRoot(),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    PrismaModule, AuthModule, NotificationsModule, WorkOrdersModule, UsersModule, CustomersModule, DistrictsModule, MetersModule, AuditModule, ReadingsModule, InvoicesModule, PaymentsModule, CutsModule, DashboardModule, UploadsModule],
  controllers: [AppController],
  providers: [AppService, InvoicesCron],
})
export class AppModule { }
