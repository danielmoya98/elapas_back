import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { DistrictsService } from './districts.service';

import { CreateDistrictDto } from './application/dto/create-district.dto';

import { UpdateDistrictDto } from './application/dto/update-district.dto';

import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/presentation/guards/roles.guard';

import { Roles } from '../auth/presentation/decorators/roles.decorator';

@ApiTags('Districts')
@ApiBearerAuth()
@Controller('districts')
export class DistrictsController {
  constructor(
    private readonly districtsService: DistrictsService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(
    @Body() dto: CreateDistrictDto,
  ) {
    return this.districtsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.districtsService.findAll();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id') id: string,

    @Body() dto: UpdateDistrictDto,
  ) {
    return this.districtsService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(
    @Param('id') id: string,
  ) {
    return this.districtsService.remove(
      id,
    );
  }
}
