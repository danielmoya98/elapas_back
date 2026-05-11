import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  BadRequestException
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly prisma: PrismaService // Inyectamos Prisma para el pago rápido
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  // Opcional: Puedes añadir @Roles('ADMIN') si solo los admins deben ver TODAS las facturas paginadas
  findAll(@Query() paginationDto: PaginationDto) {
    return this.invoicesService.findAll(
      Number(paginationDto.page || 1),
      Number(paginationDto.limit || 10)
    );
  }

  // NUEVO ENDPOINT: Pasarela de pago simulada
  @Patch(':id/pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENTE', 'ADMIN') // Permitimos que el cliente pague, y el admin también si es en caja
  async simulatePayment(@Param('id') id: string) {
    // 1. Buscamos la factura en la base de datos
    const invoice = await this.prisma.invoice.findUnique({
      where: { id }
    });

    // 2. Validaciones de seguridad
    if (!invoice) {
      throw new BadRequestException('Factura no encontrada');
    }
    if (invoice.status === 'PAGADO') {
      throw new BadRequestException('Esta factura ya se encuentra pagada');
    }

    // 3. Actualizamos el estado a PAGADO
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'PAGADO' },
    });
  }
}
