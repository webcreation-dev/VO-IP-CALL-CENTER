import { UserRole } from '../enums/user-role.enum';

export interface UserPayload {
  sub: number; // user id
  email: string;
  role: UserRole;
  tenantId: number | null; // null pour admin global
  iat?: number;
  exp?: number;
}
