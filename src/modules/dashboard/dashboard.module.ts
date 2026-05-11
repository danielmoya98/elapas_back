import { Module } from '@nestjs/common';

import { DashboardController } from './dashboard.controller';

import { DashboardService } from './dashboard.service';

import { DashboardGateway } from '../../infrastructure/websocket/gateways/dashboard.gateway';

@Module({
  controllers: [DashboardController],

  providers: [
    DashboardService,
    DashboardGateway,
  ],

  exports: [DashboardGateway],
})
export class DashboardModule { }
