import {
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateReadingDto {
  @IsString()
  meterId: string;

  @IsNumber()
  currentReading: number;

  @IsNumber()
  gpsLat: number;

  @IsNumber()
  gpsLng: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
