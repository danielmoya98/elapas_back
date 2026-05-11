import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecuteInstallationDto } from './dto/execute-installation.dto';
import { CreateBulkReadingsDto } from './dto/create-bulk-readings.dto';
import { ExecuteReadingDto } from './dto/execute-reading.dto';
import { ExecuteCutDto } from './dto/execute-cut.dto';
import { CreateCutOrderDto } from './dto/create-cut-order.dto'; // Asegúrate de tener este DTO
import { FcmService } from '../notifications/fcm.service';
import { TariffService } from '../readings/application/services/tariff.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
    private readonly tariffService: TariffService,
  ) { }

  // --- OBTENER PARA EL ADMIN (REACT) ---
  async findAll(page: number, limit: number, type?: string, status?: string) {
    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (type && type !== 'Todos') whereClause.type = type;
    if (status && status !== 'Todos') whereClause.status = status;

    const [data, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          customer: { select: { fullName: true, address: true, ci: true } },
          technician: { select: { fullName: true, email: true } },
          meter: { select: { code: true } }
        },
        orderBy: { scheduledFor: 'desc' }
      }),
      this.prisma.workOrder.count({ where: whereClause })
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  // --- OBTENER PARA EL TÉCNICO (FLUTTER) ---
  async getAssigned(technicianId: string, type?: string) {
    const whereClause: any = {
      technicianId,
      status: 'PENDING',
    };
    if (type) whereClause.type = type;

    return this.prisma.workOrder.findMany({
      where: whereClause,
      include: {
        customer: { select: { fullName: true, address: true, ci: true, phone: true, category: true } },
        meter: {
          include: {
            readings: { orderBy: { createdAt: 'desc' }, take: 1 }
          }
        }
      },
      orderBy: { scheduledFor: 'asc' }
    });
  }

  // --- GENERACIÓN MASIVA DE LECTURAS (ADMIN) ---
  async createBulkReadingOrders(dto: CreateBulkReadingsDto) {
    const customers = await this.prisma.customerProfile.findMany({
      where: {
        districtId: dto.districtId,
        status: 'ACTIVE',
        meters: { some: { status: 'ACTIVO' } }
      },
      include: { meters: { where: { status: 'ACTIVO' }, take: 1 } }
    });

    if (customers.length === 0) {
      throw new BadRequestException('No se encontraron clientes activos con medidores en este distrito.');
    }

    const ordersData = customers.map(customer => ({
      type: 'READING' as any,
      status: 'PENDING' as any,
      technicianId: dto.technicianId,
      customerId: customer.id,
      meterId: customer.meters[0].id,
      scheduledFor: new Date(dto.scheduledFor),
      description: `Lectura programada - ${new Date(dto.scheduledFor).toLocaleDateString()}`
    }));

    await this.prisma.workOrder.createMany({ data: ordersData });

    const technician = await this.prisma.user.findUnique({ where: { id: dto.technicianId } });
    if (technician?.fcmToken) {
      await this.fcmService.sendPushNotification(
        technician.fcmToken,
        '📋 Nuevas Lecturas Asignadas',
        `Se han desplegado ${customers.length} nuevas órdenes de lectura en tu ruta de trabajo.`,
        { type: 'BULK_READINGS_ASSIGNED' }
      );
    }

    return { message: 'Despliegue masivo generado con éxito', count: customers.length };
  }

  // 🔥 SOLUCIÓN ERROR 1: Método createCutOrder para el controlador
  async createCutOrder(dto: CreateCutOrderDto) {
    const customer = await this.prisma.customerProfile.findUnique({
      where: { id: dto.customerId },
      include: { meters: { where: { status: 'ACTIVO' }, take: 1 } }
    });

    if (!customer) throw new NotFoundException('Cliente no encontrado');
    if (customer.meters.length === 0) throw new BadRequestException('El cliente no tiene medidor activo');

    const order = await this.prisma.workOrder.create({
      data: {
        type: 'CUT',
        status: 'PENDING',
        technicianId: dto.technicianId,
        customerId: dto.customerId,
        meterId: customer.meters[0].id,
        scheduledFor: new Date(),
        description: dto.reason
      }
    });

    const technician = await this.prisma.user.findUnique({ where: { id: dto.technicianId } });
    if (technician?.fcmToken) {
      await this.fcmService.sendPushNotification(
        technician.fcmToken,
        '✂️ Orden de Corte URGENTE',
        `Corte asignado para ${customer.fullName}.`,
        { type: 'CUT_ASSIGNED' }
      );
    }
    return order;
  }

  // --- EJECUCIÓN DE INSTALACIÓN ---
  async executeInstallation(workOrderId: string, technicianId: string, dto: ExecuteInstallationDto) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { customer: true }
    });

    if (!workOrder || workOrder.status !== 'PENDING' || workOrder.type !== 'INSTALLATION') {
      throw new BadRequestException('Orden de trabajo no válida para instalación.');
    }

    const customerId = workOrder.customerId;
    if (!customerId) throw new BadRequestException('La orden no tiene un cliente asociado');

    const result = await this.prisma.$transaction(async (tx) => {
      const meter = await tx.meter.create({
        data: {
          code: dto.meterCode,
          customerId: customerId,
          type: 'MECANICO',
          status: 'ACTIVO',
          installedAt: new Date(),
          gpsLat: dto.gpsLat,
          gpsLng: dto.gpsLng,
        }
      });

      await tx.customerProfile.update({
        where: { id: customerId },
        data: { status: 'ACTIVE' }
      });

      const completedOrder = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: 'COMPLETED',
          executionLat: dto.gpsLat,
          executionLng: dto.gpsLng,
          photoUrl: dto.photoUrl,
          completedAt: new Date(),
          meterId: meter.id
        }
      });

      await tx.auditLog.create({
        data: {
          userId: technicianId,
          entity: 'WORK_ORDER',
          entityId: workOrderId,
          action: 'EXECUTE_INSTALLATION',
          newData: { meterCode: dto.meterCode, meterId: meter.id }
        }
      });

      return completedOrder;
    });

    return { message: 'Instalación registrada y medidor activado', data: result };
  }

  // --- EJECUCIÓN DE LECTURA MENSUAL ---
  async executeReading(workOrderId: string, technicianId: string, dto: ExecuteReadingDto) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        customer: true,
        technician: true,
        meter: { include: { readings: { orderBy: { createdAt: 'desc' }, take: 1 } } }
      }
    });

    if (!workOrder || workOrder.status !== 'PENDING' || workOrder.type !== 'READING') {
      throw new BadRequestException('Orden de lectura no válida.');
    }

    const customerId = workOrder.customerId;
    const meterId = workOrder.meterId;
    const category = workOrder.customer?.category;

    if (!customerId || !meterId || !category) throw new BadRequestException('Datos de cliente/medidor incompletos.');

    const previousReading = workOrder.meter?.readings[0]?.currentReading || 0;
    if (dto.currentReading < previousReading) {
      throw new BadRequestException(`Lectura inválida. Debe ser mayor o igual a la anterior (${previousReading})`);
    }

    const consumption = dto.currentReading - previousReading;
    const tariff = this.tariffService.calculate(category as any, consumption);

    const result = await this.prisma.$transaction(async (tx) => {
      const reading = await tx.reading.create({
        data: {
          meterId,
          technicianId,
          previousReading,
          currentReading: dto.currentReading,
          consumption,
          gpsLat: dto.gpsLat,
          gpsLng: dto.gpsLng,
          photoUrl: dto.photoUrl,
        },
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoice = await tx.invoice.create({
        data: {
          customerId,
          readingId: reading.id,
          consumption: tariff.consumption,
          fixedCharge: tariff.fixedCharge,
          unitPrice: tariff.unitPrice,
          penaltyAmount: tariff.penaltyAmount,
          subtotal: tariff.subtotal,
          total: tariff.total,
          dueDate,
          status: 'PENDIENTE'
        },
      });

      const completedOrder = await tx.workOrder.update({
        where: { id: workOrderId },
        data: { status: 'COMPLETED', executionLat: dto.gpsLat, executionLng: dto.gpsLng, photoUrl: dto.photoUrl, completedAt: new Date() }
      });

      return { reading, invoice, completedOrder };
    });

    return { message: 'Lectura procesada', total: tariff.total };
  }

  // --- 🔥 SOLUCIÓN ERROR 2 Y 3: Asegurar meterId y customerId para la transacción ---
  async executeCut(workOrderId: string, technicianId: string, dto: ExecuteCutDto) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { customer: { include: { user: true } } }
    });

    if (!workOrder || workOrder.status !== 'PENDING' || workOrder.type !== 'CUT') {
      throw new BadRequestException('Orden de corte no válida.');
    }

    // Guardamos en constantes seguras para que TypeScript no se queje
    const meterId = workOrder.meterId;
    const customerId = workOrder.customerId;

    if (!meterId || !customerId) {
      throw new BadRequestException('La orden no tiene un medidor o cliente asociado.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Suspender Medidor y Perfil usando las constantes seguras
      await tx.meter.update({
        where: { id: meterId },
        data: { status: 'SUSPENDIDO' }
      });

      await tx.customerProfile.update({
        where: { id: customerId },
        data: { status: 'SUSPENDED' }
      });

      // 2. Finalizar Orden
      const completedOrder = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: 'COMPLETED',
          executionLat: dto.gpsLat,
          executionLng: dto.gpsLng,
          photoUrl: dto.photoUrl,
          completedAt: new Date()
        }
      });

      await tx.auditLog.create({
        data: { userId: technicianId, entity: 'WORK_ORDER', entityId: workOrderId, action: 'EXECUTE_CUT', newData: { status: 'SUSPENDED' } }
      });

      return completedOrder;
    });

    try {
      if (workOrder.customer?.user?.fcmToken) {
        await this.fcmService.sendPushNotification(
          workOrder.customer.user.fcmToken,
          '🚨 Servicio Suspendido',
          'Su servicio ha sido suspendido por falta de pago.',
          { type: 'SERVICE_SUSPENDED' }
        );
      }
    } catch (e) { console.error('FCM Error:', e); }

    return { message: 'Corte ejecutado con éxito', data: result };
  }
}
