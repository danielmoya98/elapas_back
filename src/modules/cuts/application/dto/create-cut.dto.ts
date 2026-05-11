import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCutDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  // AGREGAMOS ESTO:
  @IsOptional()
  @IsString()
  technicianId?: string;
}
