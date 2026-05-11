import {
  IsEnum,
  IsOptional,
} from 'class-validator';


import { MeterStatus } from '../../../../../prisma/generated/client';

export class UpdateMeterDto {
  @IsOptional()
  @IsEnum(MeterStatus)
  status?: MeterStatus;
}
