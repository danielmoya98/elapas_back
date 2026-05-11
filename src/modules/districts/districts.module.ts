import { Module } from '@nestjs/common';

import { DistrictsController } from './districts.controller';

import { DistrictsService } from './districts.service';

import { PrismaDistrictRepository } from './infrastructure/repositories/prisma-district.repository';

@Module({
  controllers: [DistrictsController],

  providers: [
    DistrictsService,
    PrismaDistrictRepository,
  ],
})
export class DistrictsModule { }
