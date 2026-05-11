import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TariffService } from './application/services/tariff.service';

@Injectable()
export class ReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tariffService: TariffService,
  ) { }

  // 🔥 ELIMINAMOS EL MÉTODO create() AQUÍ 🔥
  // Toda la lógica transaccional y de caché se mudó a WorkOrdersService.executeReading()

  async findAll() {
    return this.prisma.reading.findMany({
      include: {
        meter: {
          include: { customer: true },
        },
        technician: true,
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
