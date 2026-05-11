import { Module } from '@nestjs/common';

import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';

@Module({
  controllers: [CustomersController],

  providers: [
    CustomersService,
    PrismaCustomerRepository,
  ],
})
export class CustomersModule { }
