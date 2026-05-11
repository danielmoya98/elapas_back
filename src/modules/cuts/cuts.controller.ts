import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { CutsService } from './cuts.service';
import { CreateCutDto } from './application/dto/create-cut.dto';
import { ExecuteCutDto } from './application/dto/execute-cut.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { GetUser } from '../auth/presentation/decorators/get-user.decorator';

@ApiTags('Service Cuts')
@ApiBearerAuth()
@Controller('cuts')
export class CutsController {
  constructor(
    private readonly cutsService: CutsService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(
    @Body() dto: CreateCutDto,
  ) {
    return this.cutsService.create(dto);
  }

  // --- NUEVO ENDPOINT PARA LA APP MÓVIL (TÉCNICO) ---
  @Get('assigned')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  getAssignedCuts(
    @GetUser() user: any,
  ) {
    return this.cutsService.getAssignedCuts(user.sub);
  }

  @Patch(':id/execute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  execute(
    @Param('id') id: string,
    @Body() dto: ExecuteCutDto,
    @GetUser() user: any,
  ) {
    return this.cutsService.execute(
      id,
      dto,
      user.sub,
    );
  }

  @Patch(':id/reconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  reconnect(
    @Param('id') id: string,
  ) {
    return this.cutsService.reconnect(
      id,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.cutsService.findAll(
      Number(paginationDto.page || 1),
      Number(paginationDto.limit || 10)
    );
  }
}
