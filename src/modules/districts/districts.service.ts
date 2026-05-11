import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateDistrictDto } from './application/dto/create-district.dto';

import { UpdateDistrictDto } from './application/dto/update-district.dto';

import { PrismaDistrictRepository } from './infrastructure/repositories/prisma-district.repository';

@Injectable()
export class DistrictsService {
  constructor(
    private readonly districtsRepository: PrismaDistrictRepository,
  ) { }

  async create(dto: CreateDistrictDto) {
    const existingDistrict =
      await this.districtsRepository.findByName(
        dto.name,
      );

    if (existingDistrict) {
      throw new BadRequestException(
        'District already exists',
      );
    }

    return this.districtsRepository.create(dto);
  }

  async findAll() {
    return this.districtsRepository.findAll();
  }

  async update(
    id: string,
    dto: UpdateDistrictDto,
  ) {
    return this.districtsRepository.update(
      id,
      dto,
    );
  }

  async remove(id: string) {
    return this.districtsRepository.delete(
      id,
    );
  }
}
