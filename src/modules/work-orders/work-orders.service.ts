import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecuteInstallationDto } from './dto/execute-installation.dto';

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) { }

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
    // 1. Verificamos que la orden exista y pertenezca a este técnico
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder) throw new NotFoundException('Orden de trabajo no encontrada');
    if (workOrder.technicianId !== technicianId) throw new BadRequestException('Esta orden pertenece a otro técnico');
    if (workOrder.status !== 'PENDING') throw new BadRequestException('Esta orden ya fue ejecutada o cancelada');
    if (workOrder.type !== 'INSTALLATION') throw new BadRequestException('Esta orden no es de instalación');

    // 🔥 CORRECCIÓN AQUÍ: Guardamos el ID en una constante segura
    const customerId = workOrder.customerId;
    if (!customerId) throw new BadRequestException('La orden no tiene un cliente asociado');

    // 2. Ejecutamos la magia transaccional
    const result = await this.prisma.$transaction(async (tx) => {

      // A. Crear el Medidor Físico
      const meter = await tx.meter.create({
        data: {
          code: dto.meterCode,
          customerId: customerId, // Usamos la constante segura de tipo string
          type: 'MECANICO',
          status: 'ACTIVO',
          installedAt: new Date(),
        }
      });

      // B. Activar al Cliente
      await tx.customerProfile.update({
        where: { id: customerId }, // Usamos la constante segura de tipo string
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
          meterId: meter.id // Vinculamos la orden al nuevo medidor
        }
      });

      return completedOrder;
    });

    return {
      message: 'Instalación registrada y cliente activado exitosamente',
      data: result
    };
  }

}
