import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppUser } from '../core/database/entities/app-user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserPayload } from '../common/interfaces/user-payload.interface';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * Auth Service
 *
 * Handles user authentication and registration
 *
 * Features:
 * - User registration (admin only)
 * - User login with JWT token generation
 * - Password hashing with bcrypt (10 rounds)
 * - User validation
 * - Tenant validation for non-admin users
 *
 * Security:
 * - Passwords hashed with bcrypt before storage
 * - Password field excluded from queries by default (select: false in entity)
 * - JWT tokens with configurable expiration
 * - Role-based access control
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AppUser)
    private readonly userRepository: Repository<AppUser>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user
   *
   * Only accessible by admin users (enforced by @Roles decorator in controller)
   *
   * Validation:
   * - Email must be unique
   * - Non-admin users must have a tenantId
   * - Password is hashed before storage
   *
   * @param registerDto - User registration data
   * @returns Created user (without password)
   * @throws ConflictException if email already exists
   * @throws BadRequestException if non-admin user has no tenantId
   */
  async register(registerDto: RegisterDto): Promise<AppUser> {
    const { email, password, firstName, lastName, role, tenantId } =
      registerDto;

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate tenantId for non-admin users
    if (role !== UserRole.ADMIN && !tenantId) {
      throw new BadRequestException(
        'Tenant ID is required for non-admin users',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      tenantId: role === UserRole.ADMIN ? null : tenantId,
    });

    // Save and return (password field is excluded by default)
    return await this.userRepository.save(user);
  }

  /**
   * Login user and generate JWT token
   *
   * Flow:
   * 1. Validate user credentials
   * 2. Generate JWT token with user payload
   * 3. Return access token and user info
   *
   * @param loginDto - User credentials
   * @returns Access token and user data
   * @throws UnauthorizedException if credentials are invalid
   */
  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    user: {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      tenantId: number | null;
    };
  }> {
    // Validate user credentials
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // Generate JWT payload
    const payload: UserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    // Generate JWT token
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  /**
   * Validate user credentials
   *
   * @param email - User email
   * @param password - Plain text password
   * @returns User if valid
   * @throws UnauthorizedException if credentials are invalid
   */
  async validateUser(email: string, password: string): Promise<AppUser> {
    // Find user with password field (select: false by default)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .addSelect('user.password')
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  /**
   * Get user by ID
   *
   * Used by JWT strategy to verify user still exists
   *
   * @param userId - User ID
   * @returns User or null
   */
  async findById(userId: number): Promise<AppUser | null> {
    return await this.userRepository.findOne({ where: { id: userId } });
  }
}
