import {
  IsNumberString,
  IsOptional,
} from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '10';
}
