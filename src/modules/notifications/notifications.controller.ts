import { Controller, Get, Patch, Param, UseGuards, Req, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard) // <-- Protege todas las rutas
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  async getMyNotifications(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user.id; // Extraído del token JWT
    return this.notificationsService.getUserNotifications(userId, Number(limit) || 20);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }
}
