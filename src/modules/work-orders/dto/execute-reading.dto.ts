import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteReadingDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  currentReading: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  gpsLat: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  gpsLng: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  photoUrl: string;
}
