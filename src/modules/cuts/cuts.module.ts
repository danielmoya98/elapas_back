import { Module } from '@nestjs/common';

import { CutsController } from './cuts.controller';

import { CutsService } from './cuts.service';
import { DashboardModule } from '../dashboard/dashboard.module';

import { PrismaCutRepository } from './infrastructure/repositories/prisma-cut.repository';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [CutsController],
  imports: [DashboardModule, AuditModule, NotificationsModule],
  providers: [
    CutsService,
    PrismaCutRepository,
  ],
})
export class CutsModule { }
