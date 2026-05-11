import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  // Se ejecuta automáticamente cuando NestJS levanta el servidor
  onModuleInit() {
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Reemplazamos los saltos de línea literales para que funcione en cualquier SO
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        this.logger.log('🔥 Firebase Admin SDK inicializado correctamente');
      } catch (error) {
        this.logger.error('Error al inicializar Firebase Admin', error);
      }
    }
  }

  async sendPushNotification(token: string, title: string, body: string, extraData?: any) {
    if (!token) {
      this.logger.warn('Intento de enviar notificación fallido: FCM Token no proporcionado');
      return;
    }

    try {
      const message = {
        token,
        notification: {
          title,
          body,
        },
        data: extraData ? this.sanitizeData(extraData) : undefined, // Datos invisibles para la app
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default', // Hace que el celular suene
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Notificación enviada exitosamente a dispositivo. ID: ${response}`);
      return response;
    } catch (error) {
      this.logger.error(`Error enviando notificación push: ${error.message}`, error);
    }
  }

  // Firebase exige que todos los valores en el objeto "data" sean strings
  private sanitizeData(data: any): { [key: string]: string } {
    const sanitized: { [key: string]: string } = {};
    for (const key in data) {
      sanitized[key] = String(data[key]);
    }
    return sanitized;
  }
}
