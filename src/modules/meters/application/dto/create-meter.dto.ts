import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MeterStatus, MeterType } from '../../../../../prisma/generated/client';

export class CreateMeterDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  customerId?: string; // Opcional

  @IsOptional()
  @IsEnum(MeterType)
  type?: MeterType;

  @IsOptional()
  @IsEnum(MeterStatus)
  status?: MeterStatus;

  @IsOptional()
  @IsInt()
  batteryLevel?: number;

  @IsOptional()
  @IsString()
  installedAt?: string; // Recibimos un string desde el input type="date"
}
