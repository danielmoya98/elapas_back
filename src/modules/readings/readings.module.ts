import { Module } from '@nestjs/common';

import { ReadingsController } from './readings.controller';

import { ReadingsService } from './readings.service';

import { DashboardModule } from '../dashboard/dashboard.module';

import { PrismaReadingRepository } from './infrastructure/repositories/prisma-reading.repository';

import { TariffService } from './application/services/tariff.service';

import { AuditModule } from '../../infrastructure/audit/audit.module';


@Module({
  controllers: [ReadingsController],
  imports: [DashboardModule, AuditModule],
  providers: [
    ReadingsService,
    PrismaReadingRepository,
    TariffService,
  ],
})
export class ReadingsModule { }
