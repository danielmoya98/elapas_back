import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkOrdersService } from './work-orders.service';
import { ExecuteInstallationDto } from './dto/execute-installation.dto';
import { CreateBulkReadingsDto } from './dto/create-bulk-readings.dto';
import { ExecuteReadingDto } from './dto/execute-reading.dto';
import { CreateCutOrderDto } from './dto/create-cut-order.dto';
import { ExecuteCutDto } from './dto/execute-cut.dto';
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

  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  getAssigned(
    @GetUser() user: any,
    @Query('type') type?: string,
  ) {
    return this.workOrdersService.getAssigned(user.sub, type);
  }

  @Post('bulk-readings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createBulkReadings(@Body() dto: CreateBulkReadingsDto) {
    return this.workOrdersService.createBulkReadingOrders(dto);
  }

  // 🔥 NUEVO: Admin genera Orden de Corte
  @Post('cuts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createCutOrder(@Body() dto: CreateCutOrderDto) {
    return this.workOrdersService.createCutOrder(dto);
  }

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

  // 🔥 NUEVO: Técnico ejecuta el Corte
  @Patch(':id/execute-cut')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  executeCut(
    @Param('id') id: string,
    @Body() dto: ExecuteCutDto,
    @GetUser() user: any,
  ) {
    return this.workOrdersService.executeCut(id, user.sub, dto);
  }
}
