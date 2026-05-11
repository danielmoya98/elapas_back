import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 🔥 CORRECCIÓN 1: CORS abierto para tu MVP
  // Así evitas que la App Móvil o tu frontend en Vercel sean bloqueados.
  app.enableCors({
    origin: '*', // Para el MVP usamos '*', luego lo cambias por la URL de tu frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('ELAPAS API')
    .setDescription('Sistema ELAPAS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // 🔥 CORRECCIÓN 2: Puerto dinámico para Render
  // Render inyecta la variable de entorno process.env.PORT
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Aplicación corriendo en puerto: ${port}`);
}

bootstrap();
