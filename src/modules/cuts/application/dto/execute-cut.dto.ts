import {
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ExecuteCutDto {
  @IsNumber()
  gpsLat: number;

  @IsNumber()
  gpsLng: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
