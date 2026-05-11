import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateCutDto } from './application/dto/create-cut.dto';
import { ExecuteCutDto } from './application/dto/execute-cut.dto';
import { DashboardGateway } from '../../infrastructure/websocket/gateways/dashboard.gateway';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { PrismaCutRepository } from './infrastructure/repositories/prisma-cut.repository';
// 👇 Importa tu servicio de notificaciones (Ajusta la ruta según tu estructura)
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardGateway: DashboardGateway,
    private readonly auditService: AuditService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly cutsRepository: PrismaCutRepository,
    private readonly notificationsService: NotificationsService, // <-- NUEVO
  ) { }

  async create(dto: CreateCutDto) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const overdueInvoices = await this.prisma.invoice.count({
      where: {
        customerId: dto.customerId,
        status: 'VENCIDO',
      },
    });

    const cut = await this.prisma.serviceCut.create({
      data: {
        customerId: dto.customerId,
        reason: dto.reason,
        status: 'PENDIENTE',
        technicianId: dto.technicianId,
      },
    });

    await this.cacheManager.del('dashboard:stats');

    await this.auditService.log({
      entity: 'SERVICE_CUT',
      entityId: cut.id,
      action: 'CREATE',
      newData: cut,
    });

    // 🔥 NUEVO: Notificamos al Técnico asignado
    if (dto.technicianId) {
      await this.notificationsService.createNotification({
        userId: dto.technicianId,
        title: 'Nueva Orden Asignada',
        message: `Se te ha asignado una orden de corte para el cliente: ${customer.fullName}.`,
        type: 'system',
      });
    }

    return cut;
  }

  async getAssignedCuts(technicianId: string) {
    return this.prisma.serviceCut.findMany({
      where: {
        technicianId: technicianId,
        status: 'PENDIENTE',
      },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async execute(
    cutId: string,
    dto: ExecuteCutDto,
    technicianId: string,
  ) {
    const cut = await this.prisma.serviceCut.findUnique({
      where: { id: cutId },
      include: { customer: true } // <-- Incluimos al cliente para la notificación
    });

    if (!cut) {
      throw new NotFoundException('Cut not found');
    }

    if (cut.status === 'EJECUTADO') {
      throw new BadRequestException('Cut already executed');
    }

    const updatedCut = await this.prisma.serviceCut.update({
      where: { id: cutId },
      data: {
        technicianId,
        status: 'EJECUTADO',
        gpsLat: dto.gpsLat,
        gpsLng: dto.gpsLng,
        photoUrl: dto.photoUrl,
      },
    });

    await this.cacheManager.del('dashboard:stats');

    this.dashboardGateway.emitCutExecuted({
      cutId: updatedCut.id,
      customerId: updatedCut.customerId,
    });

    await this.auditService.log({
      entity: 'SERVICE_CUT',
      entityId: updatedCut.id,
      action: 'EXECUTE',
      newData: updatedCut,
    });

    // 🔥 NUEVO: Notificamos al Cliente que su servicio fue cortado
    if (cut.customer && cut.customer.userId) {
      await this.notificationsService.createNotification({
        userId: cut.customer.userId,
        title: 'Servicio Suspendido',
        message: 'Su servicio ha sido suspendido por mora. Por favor, regularice su situación en nuestras oficinas.',
        type: 'alert',
      });
    }

    return updatedCut;
  }

  async reconnect(cutId: string) {
    const cut = await this.prisma.serviceCut.findUnique({
      where: { id: cutId },
      include: { customer: true } // <-- Incluimos al cliente
    });

    if (!cut) {
      throw new NotFoundException('Cut not found');
    }

    const updatedCut = await this.prisma.serviceCut.update({
      where: { id: cutId },
      data: {
        status: 'RECONEXION',
      },
    });

    await this.cacheManager.del('dashboard:stats');

    await this.auditService.log({
      entity: 'SERVICE_CUT',
      entityId: updatedCut.id,
      action: 'RECONNECT',
      newData: updatedCut,
    });

    // 🔥 NUEVO: Notificamos al Cliente
    if (cut.customer && cut.customer.userId) {
      await this.notificationsService.createNotification({
        userId: cut.customer.userId,
        title: 'Reconexión Programada',
        message: 'Se ha autorizado y programado la reconexión de su servicio en las próximas horas.',
        type: 'system',
      });
    }

    return updatedCut;
  }

  async findAll(page = 1, limit = 10) {
    const result = await this.cutsRepository.findAll({ page, limit });

    const mappedData = result.data.map(cut => {
      const debtAmount = cut.customer.invoices.reduce((sum: number, inv: any) => sum + inv.total, 0);
      const monthsOverdue = cut.customer.invoices.length;

      const statusMap: Record<string, string> = {
        PENDIENTE: 'Pendiente',
        EJECUTADO: 'Ejecutado',
        RECONEXION: 'Reconectado'
      };

      return {
        id: cut.id,
        orderCode: `CRT-${cut.id.slice(-5).toUpperCase()}`,
        customer: cut.customer.fullName,
        address: cut.customer.address,
        debtAmount: debtAmount.toFixed(2),
        monthsOverdue,
        status: statusMap[cut.status] || 'Pendiente',
        scheduledDate: cut.createdAt.toISOString().split('T')[0],
        technician: cut.technician ? cut.technician.email : 'Sin asignar',
        reason: cut.reason,
        photoUrl: cut.photoUrl || null
      };
    });

    return { data: mappedData, meta: result.meta };
  }
}
