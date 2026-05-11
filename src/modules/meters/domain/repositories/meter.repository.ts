import { Meter } from '../../../../../prisma/generated/client';

// Definimos la estructura de la paginación
export interface PaginatedMetersResult {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export abstract class MeterRepository {
  abstract create(data: any): Promise<Meter>;

  // Actualizamos para recibir parámetros y retornar el objeto paginado
  abstract findAll(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedMetersResult>;

  abstract findByCode(
    code: string,
  ): Promise<Meter | null>;

  abstract findById(
    id: string,
  ): Promise<Meter | null>;

  abstract update(
    id: string,
    data: any,
  ): Promise<Meter>;
}
