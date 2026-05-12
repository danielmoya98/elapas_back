import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UseGuards,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './application/dto/create-customer.dto';
import { ApproveCustomerDto } from './application/dto/approve-customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { GetUser } from '../auth/presentation/decorators/get-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly prisma: PrismaService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  approveAndAssign(
    @Param('id') customerId: string,
    @Body() dto: ApproveCustomerDto,
    @GetUser() admin: any,
  ) {
    return this.customersService.approveAndAssign(customerId, dto, admin.sub);
  }

  @Get('my-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENTE')
  async getMyStatus(@GetUser() user: any) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId: user.sub },
      include: {
        meters: {
          include: {
            readings: { orderBy: { createdAt: 'desc' }, take: 6 }
          }
        },
        invoices: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer) throw new NotFoundException('Perfil de cliente no encontrado');

    const unpaidInvoices = customer.invoices.filter(inv => inv.status !== 'PAGADO');

    const totalDebt = unpaidInvoices.reduce((sum, inv) => {
      return sum + Number(inv.total);
    }, 0);

    return {
      fullName: customer.fullName,
      address: customer.address,
      ci: customer.ci,
      totalDebt: parseFloat(totalDebt.toFixed(2)),
      pendingInvoices: unpaidInvoices.length,
      invoices: customer.invoices,
      meters: customer.meters.map(m => ({
        code: m.code,
        lastReading: m.readings[0]?.currentReading || 0,
        consumptionHistory: m.readings.map(r => ({
          date: r.createdAt,
          value: r.currentReading
        }))
      }))
    };
  }

  // 🔥 SOLUCIÓN: Recibir onlyWithDebt para filtrar morosos
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('onlyWithDebt') onlyWithDebt?: string,
  ) {
    const isDebt = onlyWithDebt === 'true';
    return this.customersService.findAll(
      Number(paginationDto.page || 1),
      Number(paginationDto.limit || 10),
      isDebt
    );
  }
}
