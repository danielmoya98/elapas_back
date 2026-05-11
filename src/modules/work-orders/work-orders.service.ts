import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecuteInstallationDto } from './dto/execute-installation.dto';
import { FcmService } from '../notifications/fcm.service'; // 🔥 IMPORTAMOS EL SERVICIO

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService, // 🔥 LO INYECTAMOS AQUÍ
  ) { }

  async getAssigned(technicianId: string, type?: string) {
    const whereClause: any = {
      technicianId,
      status: 'PENDING',
    };

    if (type) {
      whereClause.type = type;
    }

    return this.prisma.workOrder.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { fullName: true, address: true, ci: true, phone: true }
        }
      },
      orderBy: { scheduledFor: 'asc' }
    });
  }
  async executeInstallation(workOrderId: string, technicianId: string, dto: ExecuteInstallationDto) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { customer: true }
    });

    if (!workOrder) throw new NotFoundException('Orden de trabajo no encontrada');
    if (workOrder.technicianId !== technicianId) throw new BadRequestException('Esta orden pertenece a otro técnico');
    if (workOrder.status !== 'PENDING') throw new BadRequestException('Esta orden ya fue ejecutada o cancelada');
    if (workOrder.type !== 'INSTALLATION') throw new BadRequestException('Esta orden no es de instalación');

    const customerId = workOrder.customerId;
    if (!customerId) throw new BadRequestException('La orden no tiene un cliente asociado');

    const result = await this.prisma.$transaction(async (tx) => {
      // A. Crear el Medidor Físico
      const meter = await tx.meter.create({
        data: {
          code: dto.meterCode,
          customerId: customerId,
          type: 'MECANICO',
          status: 'ACTIVO',
          installedAt: new Date(),
        }
      });

      // B. Activar al Cliente
      await tx.customerProfile.update({
        where: { id: customerId },
        data: { status: 'ACTIVE' }
      });

      // C. Marcar la Orden como Completada y guardar evidencia
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

      // 🔥 NUEVO: D. Crear registro de Auditoría de la operación
      await tx.auditLog.create({
        data: {
          userId: technicianId,
          entity: 'WORK_ORDER',
          entityId: workOrderId,
          action: 'EXECUTE_INSTALLATION',
          newData: { meterCode: dto.meterCode, gpsLat: dto.gpsLat, gpsLng: dto.gpsLng },
        }
      });

      // 🔥 NUEVO: E. Notificar al Administrador en la Base de Datos
      const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map(admin => ({
            userId: admin.id,
            title: '✅ Instalación Completada',
            message: `El técnico instaló el medidor ${dto.meterCode} para ${workOrder.customer?.fullName}.`,
            type: 'system' // Este type te servirá en React para ponerle un icono verde
          }))
        });
      }

      return completedOrder;
    });

    // F. Disparar la notificación push al ciudadano (FCM)
    try {
      const customerRecord = await this.prisma.customerProfile.findUnique({
        where: { id: customerId },
        include: { user: true }
      });

      if (customerRecord?.user?.fcmToken) {
        await this.fcmService.sendPushNotification(
          customerRecord.user.fcmToken,
          '💧 ¡Bienvenido a ELAPAS!',
          'Su medidor ha sido instalado y su servicio está activo. Ya puede gestionar su consumo desde la app.',
          { type: 'SERVICE_ACTIVATED', meterCode: dto.meterCode }
        );
      }
    } catch (error) {
      console.error('Error al enviar notificación de bienvenida al cliente:', error);
    }

    return {
      message: 'Instalación registrada y cliente activado exitosamente',
      data: result
    };
  }
}
