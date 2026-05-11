import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './application/dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { GetUser } from '../auth/presentation/decorators/get-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreatePaymentDto,
    @GetUser() user: any,
  ) {
    return this.paymentsService.create(dto, user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.paymentsService.findAll(
      Number(paginationDto.page || 1),
      Number(paginationDto.limit || 10)
    );
  }
}
