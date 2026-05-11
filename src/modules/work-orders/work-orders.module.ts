import { Module } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersController } from './work-orders.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReadingsModule } from '../readings/readings.module'; // 🔥 IMPORTAMOS EL MÓDULO DE LECTURAS

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ReadingsModule // 🔥 ESTO PERMITE INYECTAR TARIFF SERVICE
  ],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
})
export class WorkOrdersModule { }
