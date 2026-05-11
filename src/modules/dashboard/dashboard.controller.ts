import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) { }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard) // <-- Añadido RolesGuard
  @Roles('ADMIN') // <-- Solo los administradores pueden ver el dashboard web
  getStats() {
    return this.dashboardService.getStats();
  }
}
