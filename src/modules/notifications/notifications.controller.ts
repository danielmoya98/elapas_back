import { Controller, Get, Patch, Param, UseGuards, Req, Query, UnauthorizedException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  // Función auxiliar para extraer el ID sin importar cómo lo llame tu JWT
  private extractUserId(req: any): string {
    // Si quieres ver qué trae realmente tu token, descomenta la siguiente línea:
    // console.log('Payload del JWT:', req.user);

    const id = req.user?.id || req.user?.sub || req.user?.userId;

    if (!id) {
      throw new UnauthorizedException('El token no contiene un ID de usuario válido');
    }
    return id;
  }

  @Get()
  async getMyNotifications(@Req() req: any, @Query('limit') limit?: string) {
    const userId = this.extractUserId(req);
    return this.notificationsService.getUserNotifications(userId, Number(limit) || 20);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = this.extractUserId(req);
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = this.extractUserId(req);
    return this.notificationsService.markAsRead(id, userId);
  }
}
