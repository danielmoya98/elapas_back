import { IsNotEmpty, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBulkReadingsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  districtId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  technicianId: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  scheduledFor: string;
}
