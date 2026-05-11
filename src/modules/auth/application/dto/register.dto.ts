import { Role } from '../../../../../prisma/generated/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  // 🔥 NUEVO: Para guardar el token de Firebase desde el inicio
  @IsString()
  @IsOptional()
  fcmToken?: string;

  // 🔥 NUEVO: Campos condicionales (Solo obligatorios si es CLIENTE)
  @ValidateIf((o) => o.role === Role.CLIENTE)
  @IsString()
  @IsNotEmpty()
  ci?: string;

  @ValidateIf((o) => o.role === Role.CLIENTE)
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ValidateIf((o) => o.role === Role.CLIENTE)
  @IsString()
  @IsNotEmpty()
  districtId?: string;
}
