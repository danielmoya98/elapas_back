import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import { PassportModule } from '@nestjs/passport';

import { AuditModule } from '../../infrastructure/audit/audit.module';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';

import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    AuditModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'supersecret',

      signOptions: {
        expiresIn: '1d',
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    PrismaUserRepository,
    JwtStrategy,
  ],

  exports: [AuthService],
})
export class AuthModule { }
