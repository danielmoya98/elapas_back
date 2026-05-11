import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReadingsService } from './readings.service';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';

@ApiTags('Readings')
@ApiBearerAuth()
@Controller('readings')
export class ReadingsController {
  constructor(private readonly readingsService: ReadingsService) { }

  // 🔥 ELIMINAMOS EL POST() AQUÍ 🔥
  // Las lecturas ahora se crean vía PATCH /work-orders/:id/execute-reading

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.readingsService.findAll();
  }

  @Get('meter/:code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO', 'ADMIN')
  async getMeterDetailsByCode(@Param('code') code: string) {
    const meter = await this.readingsService['prisma'].meter.findUnique({
      where: { code },
      include: {
        customer: true,
        readings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!meter) throw new NotFoundException('Medidor no encontrado');

    return {
      id: meter.id,
      code: meter.code,
      status: meter.status,
      customerName: meter.customer?.fullName,
      address: meter.customer?.address,
      previousReading: meter.readings.length > 0 ? meter.readings[0].currentReading : 0,
    };
  }
}
