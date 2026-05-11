import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveCustomerDto {
  @IsString()
  @IsNotEmpty()
  technicianId: string; // A qué técnico le asignamos la instalación

  @IsDateString()
  @IsNotEmpty()
  scheduledFor: string; // Cuándo debe ir el técnico

  @IsString()
  @IsOptional()
  description?: string; // Notas para el técnico (ej. "Cuidado con el perro")
}
