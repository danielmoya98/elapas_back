import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PrismaInvoiceRepository } from './infrastructure/repositories/prisma-invoice.repository';

@Module({
  // Si tienes un módulo global para Prisma (ej. PrismaModule),
  // asegúrate de importarlo aquí si no está como @Global()
  imports: [],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    PrismaInvoiceRepository, // <-- ¡Aquí está la pieza que faltaba!
  ],
})
export class InvoicesModule { }
