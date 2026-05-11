import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/presentation/guards/roles.guard';
import { Roles } from '../../modules/auth/presentation/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) { }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll(@Query() paginationDto: PaginationDto) {
    const page = Number(paginationDto.page || 1);
    const limit = Number(paginationDto.limit || 12);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count()
    ]);

    const mappedData = data.map(log => ({
      id: `EVT-${log.id.slice(-5).toUpperCase()}`,
      timestamp: log.createdAt.toISOString().replace('T', ' ').slice(0, 19),
      user: log.user ? log.user.email : 'Sistema Automático',
      action: log.action,
      module: log.entity,
      ipAddress: log.ipAddress || '127.0.0.1',
      details: {
        targetId: log.entityId,
        oldData: log.oldData,
        newData: log.newData
      }
    }));

    return {
      data: mappedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  // NUEVO: Endpoint para la pestaña "Mi Actividad" en el perfil
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async findMyActivity(@Request() req, @Query() paginationDto: PaginationDto) {
    const page = Number(paginationDto.page || 1);
    const limit = Number(paginationDto.limit || 10);
    const userId = req.user.sub;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where: { userId }, // Filtrar solo por el usuario actual
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where: { userId } })
    ]);

    const mappedData = data.map(log => ({
      id: log.id,
      action: log.action,
      detail: `Acción ejecutada en el módulo ${log.entity}`,
      time: log.createdAt.toISOString().replace('T', ' ').slice(0, 19),
      ip: log.ipAddress || '127.0.0.1'
    }));

    return {
      data: mappedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }
}
