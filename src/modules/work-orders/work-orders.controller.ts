import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { ExecuteInstallationDto } from './dto/execute-installation.dto';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { GetUser } from '../auth/presentation/decorators/get-user.decorator';

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) { }

  // 1. Obtener las órdenes asignadas al técnico que hace la petición
  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  getAssigned(
    @GetUser() user: any,
    @Query('type') type?: string, // Puede ser 'INSTALLATION', 'CUT', etc.
  ) {
    return this.workOrdersService.getAssigned(user.sub, type);
  }

  // 2. Ejecutar la instalación
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
}
