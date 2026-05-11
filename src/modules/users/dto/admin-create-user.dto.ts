import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Role } from '../../../../prisma/generated/client';

export class AdminCreateUserDto {
  @IsNotEmpty() @IsString() fullName: string;
  @IsNotEmpty() @IsEmail() email: string;
  @IsNotEmpty() @IsEnum(Role) role: Role;
  @IsOptional() @IsString({ each: true }) districtIds?: string[]; // Para asignar zonas de inmediato
}
