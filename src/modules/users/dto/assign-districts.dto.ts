import { IsArray, IsString } from 'class-validator';

export class AssignDistrictsDto {
  @IsArray() @IsString({ each: true }) districtIds: string[];
}
