import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../prisma/prisma.service';

import { ReadingRepository } from '../../domain/repositories/reading.repository';

@Injectable()
export class PrismaReadingRepository
  implements ReadingRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(data: any) {
    return this.prisma.reading.create({
      data,

      include: {
        meter: true,
        technician: true,
      },
    });
  }

  async findLastByMeter(
    meterId: string,
  ) {
    return this.prisma.reading.findFirst({
      where: {
        meterId,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAll() {
    return this.prisma.reading.findMany({
      include: {
        meter: {
          include: {
            customer: true,
          },
        },

        technician: true,

        invoice: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
