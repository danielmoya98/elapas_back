import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CustomerCategory } from '../../../../../prisma/generated/client'; // Ajusta la ruta si es necesario

export class CreateCustomerDto {
  @IsEmail()
  email: string;

  // 1. Hacemos el password OPCIONAL porque el backend lo autogenera con el CI
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  ci: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  districtId: string;

  // 2. Agregamos el campo category que el frontend está enviando
  @IsOptional()
  @IsEnum(CustomerCategory)
  category?: CustomerCategory;
}
