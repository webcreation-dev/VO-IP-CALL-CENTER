import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Register DTO
 *
 * Data Transfer Object for creating a new user
 * Only accessible by admin users
 *
 * Validation:
 * - Email must be valid and unique
 * - Password minimum 6 characters
 * - Role must be valid enum value
 * - TenantId required for non-admin users
 *
 * @example
 * {
 *   "email": "agent@company.com",
 *   "password": "SecurePassword123!",
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "role": "agent",
 *   "tenantId": 1
 * }
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'agent@company.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'SecurePassword123!',
    minLength: 6,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.AGENT,
  })
  @IsEnum(UserRole, { message: 'Invalid role' })
  @IsNotEmpty({ message: 'Role is required' })
  role: UserRole;

  @ApiPropertyOptional({
    description:
      'Tenant ID (required for non-admin users, null for global admin)',
    example: 1,
    nullable: true,
  })
  @IsNumber({}, { message: 'Tenant ID must be a number' })
  @IsOptional()
  tenantId?: number | null;
}
