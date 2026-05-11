import { Controller, Get, Patch, Param, UseGuards, Req, Query, UnauthorizedException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard) // <-- Protege todas las rutas
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  // Función privada solo para este controlador: extrae el ID de forma segura
  private getUserId(req: any): string {
    // Busca en 'sub' (como lo guardaste en el login) o en 'id' por si acaso
    const userId = req.user?.sub || req.user?.id;

    // Candado crítico: Si no hay ID, cortamos la petición aquí mismo
    // para que Prisma NUNCA reciba un 'undefined' y traiga toda la tabla.
    if (!userId) {
      throw new UnauthorizedException('No se pudo identificar al usuario desde el token');
    }

    return userId;
  }

  @Get()
  async getMyNotifications(@Req() req: any, @Query('limit') limit?: string) {
    const userId = this.getUserId(req);
    return this.notificationsService.getUserNotifications(userId, Number(limit) || 20);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = this.getUserId(req);
    return this.notificationsService.markAsRead(id, userId);
  }
}
