import { CustomerProfile } from '../../../../../prisma/generated/client';

// Definimos la estructura de la paginación que el repositorio debe devolver
export interface PaginatedCustomersResult {
  data: any[]; // Usamos any[] porque Prisma agrega relaciones dinámicas (user, district, invoices)
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export abstract class CustomerRepository {
  abstract create(data: any): Promise<CustomerProfile>;

  abstract findAll(params: {
    page: number;
    limit: number;
  }): Promise<PaginatedCustomersResult>; // <-- Aquí aplicamos el cambio clave

  abstract findByCi(
    ci: string,
  ): Promise<CustomerProfile | null>;
}
