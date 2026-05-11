import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateReadingDto } from './application/dto/create-reading.dto';
import { TariffService } from './application/services/tariff.service';
import { DashboardGateway } from '../../infrastructure/websocket/gateways/dashboard.gateway';
import { AuditService } from '../../infrastructure/audit/audit.service';

@Injectable()
export class ReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tariffService: TariffService,
    private readonly dashboardGateway: DashboardGateway,
    private readonly auditService: AuditService,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) { }

  async create(dto: CreateReadingDto, technicianId: string) {
    const meter = await this.prisma.meter.findUnique({
      where: {
        id: dto.meterId,
      },
      include: {
        customer: true,
      },
    });

    if (!meter) {
      throw new NotFoundException('Meter not found');
    }

    // --- REGLA DE NEGOCIO Y CONTROL DE TIPOS ---
    if (!meter.customer) {
      throw new BadRequestException('Cannot create reading: Meter is not assigned to a customer');
    }

    // Guardamos la referencia segura del cliente antes de entrar a scopes anidados (transacción)
    const customerId = meter.customer.id;
    const customerCategory = meter.customer.category;

    if (meter.status !== 'ACTIVO') {
      throw new BadRequestException('Meter inactive');
    }

    const lastReading = await this.prisma.reading.findFirst({
      where: {
        meterId: dto.meterId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const previousReading = lastReading?.currentReading || 0;

    if (dto.currentReading < previousReading) {
      throw new BadRequestException('Invalid reading: Current reading cannot be lower than previous');
    }

    const consumption = dto.currentReading - previousReading;

    const tariff = this.tariffService.calculate(
      customerCategory, // Usamos la variable segura
      consumption,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const reading = await tx.reading.create({
        data: {
          meterId: dto.meterId,
          technicianId,
          previousReading,
          currentReading: dto.currentReading,
          consumption,
          gpsLat: dto.gpsLat,
          gpsLng: dto.gpsLng,
          photoUrl: dto.photoUrl,
        },
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoice = await tx.invoice.create({
        data: {
          customerId: customerId, // Usamos la variable segura, TS ya no se quejará
          readingId: reading.id,
          consumption: tariff.consumption,
          fixedCharge: tariff.fixedCharge,
          unitPrice: tariff.unitPrice,
          penaltyAmount: tariff.penaltyAmount,
          subtotal: tariff.subtotal,
          total: tariff.total,
          dueDate,
        },
      });

      return {
        reading,
        invoice,
      };
    });

    await this.cacheManager.del('dashboard:stats');

    this.dashboardGateway.emitReadingCreated({
      readingId: result.reading.id,
      customerId: customerId, // Usamos la variable segura
      consumption,
    });

    await this.auditService.log({
      entity: 'READING',
      entityId: result.reading.id,
      action: 'CREATE',
      newData: result,
    });

    return result;
  }

  async findAll() {
    return this.prisma.reading.findMany({
      include: {
        meter: {
          include: {
            customer: true,
          },
        },
        technician: true,
        invoice: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
