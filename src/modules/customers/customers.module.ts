import { Module } from '@nestjs/common';

import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';
import { FcmService } from '../notifications/fcm.service';

@Module({
  controllers: [CustomersController],

  providers: [
    CustomersService,
    PrismaCustomerRepository,
    FcmService,
  ],
})
export class CustomersModule { }
