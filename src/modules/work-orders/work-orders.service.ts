import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecuteInstallationDto } from './dto/execute-installation.dto';
import { CreateBulkReadingsDto } from './dto/create-bulk-readings.dto';
import { ExecuteReadingDto } from './dto/execute-reading.dto';
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
          technician: { select: { fullName: true, email: true } }
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
        customer: { select: { fullName: true, address: true, ci: true, phone: true } },
        meter: { select: { code: true, gpsLat: true, gpsLng: true } }
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

  // --- EJECUCIÓN DE INSTALACIÓN ---
  async executeInstallation(workOrderId: string, technicianId: string, dto: ExecuteInstallationDto) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { customer: true }
    });

    if (!workOrder) throw new NotFoundException('Orden no encontrada');
    if (workOrder.technicianId !== technicianId) throw new BadRequestException('Orden de otro técnico');
    if (workOrder.status !== 'PENDING') throw new BadRequestException('Orden inactiva');
    if (workOrder.type !== 'INSTALLATION') throw new BadRequestException('Tipo incorrecto');

    const customerId = workOrder.customerId;
    if (!customerId) throw new BadRequestException('Falta cliente');

    const result = await this.prisma.$transaction(async (tx) => {
      const meter = await tx.meter.create({
        data: {
          code: dto.meterCode, customerId, type: 'MECANICO', status: 'ACTIVO',
          installedAt: new Date(), gpsLat: dto.gpsLat, gpsLng: dto.gpsLng,
        }
      });

      await tx.customerProfile.update({
        where: { id: customerId }, data: { status: 'ACTIVE' }
      });

      const completedOrder = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          status: 'COMPLETED', executionLat: dto.gpsLat, executionLng: dto.gpsLng,
          photoUrl: dto.photoUrl, completedAt: new Date(), meterId: meter.id
        }
      });

      await tx.auditLog.create({
        data: { userId: technicianId, entity: 'WORK_ORDER', entityId: workOrderId, action: 'EXECUTE_INSTALLATION', newData: { meterCode: dto.meterCode } }
      });

      return completedOrder;
    });

    try {
      const customerRecord = await this.prisma.customerProfile.findUnique({ where: { id: customerId }, include: { user: true } });
      if (customerRecord?.user?.fcmToken) {
        await this.fcmService.sendPushNotification(
          customerRecord.user.fcmToken, '💧 ¡Bienvenido a ELAPAS!', 'Medidor instalado exitosamente.', { type: 'SERVICE_ACTIVATED' }
        );
      }
    } catch (e) { console.error(e); }

    return { message: 'Instalación registrada', data: result };
  }

  // --- EJECUCIÓN DE LECTURA MENSUAL ---
  async executeReading(workOrderId: string, technicianId: string, dto: ExecuteReadingDto) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        customer: true,
        meter: { include: { readings: { orderBy: { createdAt: 'desc' }, take: 1 } } }
      }
    });

    if (!workOrder) throw new NotFoundException('Orden no encontrada');
    if (workOrder.technicianId !== technicianId) throw new BadRequestException('Orden de otro técnico');
    if (workOrder.status !== 'PENDING') throw new BadRequestException('Orden inactiva');
    if (workOrder.type !== 'READING') throw new BadRequestException('Tipo incorrecto');

    const customerId = workOrder.customerId;
    const meterId = workOrder.meterId;
    const category = workOrder.customer?.category;

    if (!customerId || !meterId || !category) throw new BadRequestException('Datos incompletos en la orden');

    const previousReading = workOrder.meter?.readings[0]?.currentReading || 0;
    if (dto.currentReading < previousReading) {
      throw new BadRequestException(`Lectura inválida. Debe ser mayor o igual a ${previousReading}`);
    }

    const consumption = dto.currentReading - previousReading;
    const isLeakAlert = consumption > 50;

    const tariff = this.tariffService.calculate(category as any, consumption);

    const result = await this.prisma.$transaction(async (tx) => {
      const reading = await tx.reading.create({
        data: {
          meterId, technicianId, previousReading, currentReading: dto.currentReading,
          consumption, gpsLat: dto.gpsLat, gpsLng: dto.gpsLng, photoUrl: dto.photoUrl,
        },
      });

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoice = await tx.invoice.create({
        data: {
          customerId, readingId: reading.id,
          consumption: tariff.consumption, fixedCharge: tariff.fixedCharge,
          unitPrice: tariff.unitPrice, penaltyAmount: tariff.penaltyAmount,
          subtotal: tariff.subtotal, total: tariff.total, dueDate,
          status: 'PENDIENTE' // 🔥 CORRECCIÓN: Estado válido según tu Enum
        },
      });

      const completedOrder = await tx.workOrder.update({
        where: { id: workOrderId },
        data: { status: 'COMPLETED', executionLat: dto.gpsLat, executionLng: dto.gpsLng, photoUrl: dto.photoUrl, completedAt: new Date() }
      });

      await tx.auditLog.create({
        data: { userId: technicianId, entity: 'WORK_ORDER', entityId: workOrderId, action: 'EXECUTE_READING', newData: { consumption, total: tariff.total } }
      });

      const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map(a => ({
            userId: a.id, title: '📑 Factura Generada', message: `Lectura procesada para ${workOrder.customer?.fullName}. Total: Bs ${tariff.total}`, type: 'system'
          }))
        });
      }

      return { reading, invoice, completedOrder };
    });

    try {
      const customerRecord = await this.prisma.customerProfile.findUnique({ where: { id: customerId }, include: { user: true } });
      if (customerRecord?.user?.fcmToken) {
        await this.fcmService.sendPushNotification(
          customerRecord.user.fcmToken,
          '📑 Nueva Factura Generada',
          `Se registró su lectura: ${consumption} m³. Total a pagar: Bs. ${tariff.total}.`,
          { invoiceId: result.invoice.id, type: 'INVOICE_GENERATED' }
        );
      }
    } catch (e) { console.error(e); }

    return {
      message: 'Lectura completada y facturada con éxito',
      consumption,
      isLeakAlert,
      total: tariff.total
    };
  }
}
