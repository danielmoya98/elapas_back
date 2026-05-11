import { District } from '../../../../../prisma/generated/client';

export abstract class DistrictRepository {
  abstract create(
    data: any,
  ): Promise<District>;

  abstract findAll(): Promise<District[]>;

  abstract findByName(
    name: string,
  ): Promise<District | null>;

  abstract update(
    id: string,
    data: any,
  ): Promise<District>;

  abstract delete(
    id: string,
  ): Promise<District>;
}
