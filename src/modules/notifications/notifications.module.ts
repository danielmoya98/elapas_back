import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // Importa tu PrismaModule
import { FcmService } from './fcm.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, FcmService],
  exports: [NotificationsService, FcmService],
})
export class NotificationsModule { }
