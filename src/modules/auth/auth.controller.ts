import { Body, Controller, Post, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './application/dto/register.dto';
import { LoginDto } from './application/dto/login.dto';
import { UpdatePasswordDto } from './application/dto/update-password.dto'; // NUEVO
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard'; // NUEVO

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // NUEVO: Endpoint para cambio de contraseña (Seguridad)
  @Patch('password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updatePassword(@Request() req, @Body() dto: UpdatePasswordDto) {
    return this.authService.updatePassword(req.user.sub, dto);
  }
}
