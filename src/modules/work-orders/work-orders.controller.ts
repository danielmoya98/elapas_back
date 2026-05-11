import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { ExecuteInstallationDto } from './dto/execute-installation.dto';
import { CreateBulkReadingsDto } from './dto/create-bulk-readings.dto';
import { ExecuteReadingDto } from './dto/execute-reading.dto';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { GetUser } from '../auth/presentation/decorators/get-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) { }

  // 🔥 NUEVO: Obtener TODAS las órdenes (Para el Panel Web en React)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.workOrdersService.findAll(
      Number(paginationDto.page || 1),
      Number(paginationDto.limit || 10),
      type,
      status
    );
  }

  // Obtener las órdenes asignadas al técnico
  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  getAssigned(
    @GetUser() user: any,
    @Query('type') type?: string,
  ) {
    return this.workOrdersService.getAssigned(user.sub, type);
  }

  // 🔥 NUEVO: Generar Órdenes de Lectura Masivas (Admin)
  @Post('bulk-readings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createBulkReadings(@Body() dto: CreateBulkReadingsDto) {
    return this.workOrdersService.createBulkReadingOrders(dto);
  }

  // Ejecutar la instalación
  @Patch(':id/execute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  executeInstallation(
    @Param('id') id: string,
    @Body() dto: ExecuteInstallationDto,
    @GetUser() user: any,
  ) {
    return this.workOrdersService.executeInstallation(id, user.sub, dto);
  }

  // 🔥 NUEVO: Ejecutar la lectura (Técnico)
  @Patch(':id/execute-reading')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  executeReading(
    @Param('id') id: string,
    @Body() dto: ExecuteReadingDto,
    @GetUser() user: any,
  ) {
    return this.workOrdersService.executeReading(id, user.sub, dto);
  }
}
