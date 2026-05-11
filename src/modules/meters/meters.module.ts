import { Module } from '@nestjs/common';

import { MetersController } from './meters.controller';

import { MetersService } from './meters.service';

import { PrismaMeterRepository } from './infrastructure/repositories/prisma-meter.repository';

@Module({
  controllers: [MetersController],

  providers: [
    MetersService,
    PrismaMeterRepository,
  ],
})
export class MetersModule { }
