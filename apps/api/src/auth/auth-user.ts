import { UserRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  displayName: string;
};
