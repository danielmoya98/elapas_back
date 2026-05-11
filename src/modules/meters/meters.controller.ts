import {
  Body,
  Controller,
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

import { MetersService } from './meters.service';

import { CreateMeterDto } from './application/dto/create-meter.dto';

import { UpdateMeterDto } from './application/dto/update-meter.dto';

import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';

import { RolesGuard } from '../auth/presentation/guards/roles.guard';

import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto'; // Ajusta la ruta
import { Query } from '@nestjs/common';

@ApiTags('Meters')
@ApiBearerAuth()
@Controller('meters')
export class MetersController {
  constructor(
    private readonly metersService: MetersService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(
    @Body() dto: CreateMeterDto,
  ) {
    return this.metersService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.metersService.findAll(
      Number(paginationDto.page || 1),
      Number(paginationDto.limit || 10)
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id') id: string,

    @Body() dto: UpdateMeterDto,
  ) {
    return this.metersService.update(
      id,
      dto,
    );
  }
}
