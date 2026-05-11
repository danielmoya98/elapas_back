import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, CustomerCategory } from '../../../prisma/generated/client';
import { CreateCustomerDto } from './application/dto/create-customer.dto';
import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';
import { ApproveCustomerDto } from './application/dto/approve-customer.dto';
import { CustomerStatus, WorkOrderType, WorkOrderStatus } from '../../../prisma/generated/client';
import { FcmService } from '../notifications/fcm.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customersRepository: PrismaCustomerRepository,
    private readonly fcmService: FcmService,
  ) { }

  async create(dto: CreateCustomerDto) {
    const existingCustomer = await this.customersRepository.findByCi(dto.ci);
    if (existingCustomer) throw new BadRequestException('El cliente con este CI ya existe');

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('El correo electrónico ya está registrado');

    // CI como contraseña por defecto para facilitar el primer acceso
    const hashedPassword = await bcrypt.hash(dto.ci, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: Role.CLIENTE,
        },
      });

      return tx.customerProfile.create({
        data: {
          userId: user.id,
          districtId: dto.districtId,
          fullName: dto.fullName,
          ci: dto.ci,
          phone: dto.phone,
          address: dto.address,
          category: (dto as any).category || CustomerCategory.DOMESTICA,
        },
        include: { user: true, district: true },
      });
    });
  }

  async findAll(page = 1, limit = 10) {
    const result = await this.customersRepository.findAll({ page, limit });

    const mappedData = result.data.map(customer => {
      // Deuda total acumulada de facturas vencidas
      const debt = customer.invoices
        .filter(inv => inv.status === 'VENCIDO')
        .reduce((sum, inv) => sum + inv.total, 0);

      // Determinación de estado para el Dashboard Web
      let status = 'Activo';
      const lastCut = customer.cuts[0];

      if (lastCut && lastCut.status === 'EJECUTADO') {
        status = 'Suspendido';
      } else if (debt > 0) {
        status = 'Mora';
      }

      // Limpiamos el objeto para el frontend
      const { invoices, cuts, ...cleanCustomer } = customer;
      return {
        ...cleanCustomer,
        debt: debt.toFixed(2),
        status,
        code: `C-${customer.id.slice(-5).toUpperCase()}`
      };
    });

    return { data: mappedData, meta: result.meta };
  }

  async approveAndAssign(customerId: string, dto: ApproveCustomerDto, adminId: string) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { id: customerId }
    });

    if (!customer) throw new NotFoundException('Cliente no encontrado');
    if (customer.status !== 'PENDING_VERIFICATION') {
      throw new BadRequestException('Este cliente ya fue verificado o está suspendido');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const workOrder = await tx.workOrder.create({
        data: {
          type: 'INSTALLATION',
          status: 'PENDING',
          customerId: customer.id,
          technicianId: dto.technicianId,
          description: dto.description ?? 'Instalación de nuevo medidor',
          scheduledFor: new Date(dto.scheduledFor),
        },
        include: {
          technician: true,
          customer: true
        }
      });

      return workOrder;
    });

    // 🔥 LA MAGIA OCURRE AQUÍ 🔥
    if (result.technician.fcmToken && result.customer) {
      await this.fcmService.sendPushNotification(
        result.technician.fcmToken,
        '🛠️ Nueva Instalación Asignada',
        `Dirígete a: ${result.customer.address} para instalar el medidor de ${result.customer.fullName}.`,
        {
          workOrderId: result.id,
          type: 'INSTALLATION'
        }
      );
    }

    return {
      message: 'Cliente aprobado y orden de trabajo generada con éxito',
      workOrderId: result.id
    };
  }

}
