import { User } from '../../../../../prisma/generated/client';

export abstract class UserRepository {
  abstract findByEmail(
    email: string,
  ): Promise<User | null>;

  abstract create(data: {
    email: string;
    password: string;
    role: any;
  }): Promise<User>;
}
