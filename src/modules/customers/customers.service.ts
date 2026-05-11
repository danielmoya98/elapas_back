import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, CustomerCategory } from '../../../prisma/generated/client';
import { CreateCustomerDto } from './application/dto/create-customer.dto';
import { PrismaCustomerRepository } from './infrastructure/repositories/prisma-customer.repository';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customersRepository: PrismaCustomerRepository,
  ) { }

  async create(dto: CreateCustomerDto) {
    const existingCustomer = await this.customersRepository.findByCi(dto.ci);
    if (existingCustomer) throw new BadRequestException('El cliente con este CI ya existe');

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new BadRequestException('El correo electrónico ya está registrado');

    // CI como contraseña por defecto para facilitar el primer acceso
    const hashedPassword = await bcrypt.hash(dto.ci, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: Role.CLIENTE,
        },
      });

      return tx.customerProfile.create({
        data: {
          userId: user.id,
          districtId: dto.districtId,
          fullName: dto.fullName,
          ci: dto.ci,
          phone: dto.phone,
          address: dto.address,
          category: (dto as any).category || CustomerCategory.DOMESTICA,
        },
        include: { user: true, district: true },
      });
    });
  }

  async findAll(page = 1, limit = 10) {
    const result = await this.customersRepository.findAll({ page, limit });

    const mappedData = result.data.map(customer => {
      // Deuda total acumulada de facturas vencidas
      const debt = customer.invoices
        .filter(inv => inv.status === 'VENCIDO')
        .reduce((sum, inv) => sum + inv.total, 0);

      // Determinación de estado para el Dashboard Web
      let status = 'Activo';
      const lastCut = customer.cuts[0];

      if (lastCut && lastCut.status === 'EJECUTADO') {
        status = 'Suspendido';
      } else if (debt > 0) {
        status = 'Mora';
      }

      // Limpiamos el objeto para el frontend
      const { invoices, cuts, ...cleanCustomer } = customer;
      return {
        ...cleanCustomer,
        debt: debt.toFixed(2),
        status,
        code: `C-${customer.id.slice(-5).toUpperCase()}`
      };
    });

    return { data: mappedData, meta: result.meta };
  }
}
