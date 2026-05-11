import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { ReadingsService } from './readings.service';

import { CreateReadingDto } from './application/dto/create-reading.dto';

import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/presentation/guards/roles.guard';

import { Roles } from '../auth/presentation/decorators/roles.decorator';

import { GetUser } from '../auth/presentation/decorators/get-user.decorator';

@ApiTags('Readings')
@ApiBearerAuth()
@Controller('readings')
export class ReadingsController {
  constructor(
    private readonly readingsService: ReadingsService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  create(
    @Body() dto: CreateReadingDto,
    @GetUser() user: any,
  ) {
    return this.readingsService.create(
      dto,
      user.sub,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.readingsService.findAll();
  }

  @Get('meter/:code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO', 'ADMIN')
  async getMeterDetailsByCode(@Param('code') code: string) {
    // Usamos el acceso a Prisma a través del servicio para buscar el medidor
    const meter = await this.readingsService['prisma'].meter.findUnique({
      where: { code },
      include: {
        customer: true,
        readings: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Traemos solo la última lectura para obtener el valor anterior
        },
      },
    });

    if (!meter) {
      throw new NotFoundException('Medidor no encontrado');
    }

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
