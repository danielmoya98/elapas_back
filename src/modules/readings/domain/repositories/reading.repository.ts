import { Reading } from '../../../../../prisma/generated/client';

export abstract class ReadingRepository {
  abstract create(data: any): Promise<Reading>;

  abstract findLastByMeter(
    meterId: string,
  ): Promise<Reading | null>;

  abstract findAll(): Promise<Reading[]>;
}
