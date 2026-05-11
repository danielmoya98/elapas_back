import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) { }

  async log(params: {
    userId?: string; // <-- NUEVO: Para saber QUIÉN hizo la acción
    entity: string;
    entityId: string;
    action: string;
    oldData?: any;
    newData?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId, // <-- Agregado
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        oldData: params.oldData,
        newData: params.newData,
      },
    });
  }
}
