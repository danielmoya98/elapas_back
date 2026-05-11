import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ExecuteInstallationDto {
  @IsString()
  @IsNotEmpty()
  meterCode: string;

  @IsNumber()
  @IsNotEmpty()
  gpsLat: number;

  @IsNumber()
  @IsNotEmpty()
  gpsLng: number;

  @IsString()
  @IsNotEmpty()
  photoUrl: string;
}
