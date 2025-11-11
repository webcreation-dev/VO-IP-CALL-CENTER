import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { UserPayload } from '../common/interfaces/user-payload.interface';

/**
 * Auth Controller
 *
 * Handles authentication endpoints
 *
 * Endpoints:
 * - POST /auth/register - Create new user (admin only)
 * - POST /auth/login - Login and get JWT token (public)
 * - GET /auth/me - Get current user profile (authenticated)
 *
 * Public endpoints:
 * - login: Marked with @Public() decorator
 *
 * Protected endpoints:
 * - register: Requires admin role
 * - me: Requires authentication
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   *
   * Only accessible by admin users
   * Creates a new user account with hashed password
   *
   * @param registerDto - User registration data
   * @returns Created user (without password)
   */
  @Post('register')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account. Only accessible by admin users.',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    schema: {
      example: {
        success: true,
        data: {
          id: 5,
          email: 'agent@company.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'agent',
          tenantId: 1,
          createdAt: '2025-10-30T18:00:00.000Z',
          updatedAt: '2025-10-30T18:00:00.000Z',
        },
        timestamp: '2025-10-30T18:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not admin',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists',
  })
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  /**
   * Login user
   *
   * Public endpoint - no authentication required
   * Returns JWT access token and user information
   *
   * @param loginDto - User credentials
   * @returns Access token and user data
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description: 'Authenticate user and receive JWT access token',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 5,
            email: 'agent@company.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'agent',
            tenantId: 1,
          },
        },
        timestamp: '2025-10-30T18:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  /**
   * Get current user profile
   *
   * Returns the authenticated user's information
   * User data is extracted from JWT token
   *
   * @param user - Current authenticated user
   * @returns User profile
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Get the authenticated user information from JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    schema: {
      example: {
        success: true,
        data: {
          sub: 5,
          email: 'agent@company.com',
          role: 'agent',
          tenantId: 1,
        },
        timestamp: '2025-10-30T18:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  async getProfile(@CurrentUser() user: UserPayload) {
    return await this.authService.findById(user.sub);
  }
}
