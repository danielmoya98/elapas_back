import { ServiceCut } from '../../../../../prisma/generated/client';

export interface PaginatedCutsResult {
  data: any[];
  meta: { total: number; page: number; limit: number; totalPages: number; };
}

export abstract class CutRepository {
  abstract create(data: any): Promise<ServiceCut>;
  abstract findAll(params: { page: number; limit: number }): Promise<PaginatedCutsResult>;
  abstract findById(id: string): Promise<ServiceCut | null>;
  abstract update(id: string, data: any): Promise<ServiceCut>;
}
