import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMeterDto } from './application/dto/create-meter.dto';
import { UpdateMeterDto } from './application/dto/update-meter.dto';
import { PrismaMeterRepository } from './infrastructure/repositories/prisma-meter.repository';

@Injectable()
export class MetersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metersRepository: PrismaMeterRepository,
  ) { }

  async create(dto: CreateMeterDto) {
    const existingMeter = await this.metersRepository.findByCode(dto.code);

    if (existingMeter) {
      throw new BadRequestException('Meter already exists');
    }

    // Validar cliente SOLO si se envió un customerId (Permite tener medidores en almacén)
    if (dto.customerId) {
      const customer = await this.prisma.customerProfile.findUnique({
        where: { id: dto.customerId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    return this.metersRepository.create({
      code: dto.code,
      customerId: dto.customerId || null,

      // Aseguramos soporte para IoT y niveles de batería
      type: (dto as any).type || 'MECANICO',
      status: dto.status || 'ACTIVO',
      batteryLevel: (dto as any).type === 'ULTRASONICO' ? ((dto as any).batteryLevel || 100) : null,
      installedAt: (dto as any).installedAt ? new Date((dto as any).installedAt) : null,
    });
  }

  async findAll(page = 1, limit = 10) {
    const result = await this.metersRepository.findAll({ page, limit });

    // Mapeo de datos para que el Frontend (React) los consuma directamente
    const mappedData = result.data.map(meter => {
      // 1. Extraer la última lectura
      const lastReading = meter.readings && meter.readings.length > 0
        ? meter.readings[0].currentReading
        : 0;

      // 2. Mapear estado DB -> Estado UI
      const statusMap: Record<string, string> = {
        ACTIVO: 'Operativo',
        DANADO: 'Fallo',
        SUSPENDIDO: 'Mantenimiento'
      };

      // 3. Mapear Tipo DB -> Tipo UI
      const typeMap: Record<string, string> = {
        MECANICO: 'Mecánico',
        ULTRASONICO: 'Ultrasónico (IoT)'
      };

      return {
        id: meter.id,
        serial: meter.code,
        type: typeMap[meter.type] || 'Mecánico',
        status: statusMap[meter.status] || 'Operativo',
        lastReading: lastReading.toFixed(1),
        battery: meter.batteryLevel,
        customer: meter.customer ? meter.customer.fullName : 'Sin asignar',
        installationDate: meter.installedAt ? meter.installedAt.toISOString().split('T')[0] : null
      };
    });

    return { data: mappedData, meta: result.meta };
  }

  async update(id: string, dto: UpdateMeterDto) {
    const meter = await this.metersRepository.findById(id);

    if (!meter) {
      throw new NotFoundException('Meter not found');
    }

    return this.metersRepository.update(id, dto);
  }
}
