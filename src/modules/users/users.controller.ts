import { Controller, Get, Patch, Post, Request, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AssignDistrictsDto } from './dto/assign-districts.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @Get('technicians')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAllTechnicians() {
    return this.usersService.findTechnicians();
  }

  // --- ENDPOINTS DE ADMINISTRACIÓN DE USUARIOS ---

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAllUsers(@Query('role') role?: string, @Query('status') status?: string) {
    return this.usersService.findAllUsers(role, status);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.usersService.createUserAdmin(dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  toggleUserStatus(@Param('id') id: string) {
    return this.usersService.toggleStatus(id);
  }

  @Patch(':id/districts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  assignDistricts(@Param('id') id: string, @Body() dto: AssignDistrictsDto) {
    return this.usersService.assignDistricts(id, dto.districtIds);
  }

  @Post(':id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  resetUserPassword(@Param('id') id: string) {
    return this.usersService.adminResetPassword(id);
  }
}
