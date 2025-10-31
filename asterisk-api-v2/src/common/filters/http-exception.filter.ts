import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * HTTP Exception Filter
 *
 * Catches all HttpException instances and formats them consistently
 *
 * Applied globally via APP_FILTER in app.module.ts
 *
 * Response format:
 * {
 *   success: false,
 *   statusCode: 400,
 *   message: "Validation failed",
 *   errors: [...], // Optional, for validation errors
 *   timestamp: "2025-10-30T18:00:00.000Z",
 *   path: "/api/v1/queues"
 * }
 *
 * @example
 * Original: throw new BadRequestException('Invalid queue name')
 * Formatted: {
 *   success: false,
 *   statusCode: 400,
 *   message: "Invalid queue name",
 *   timestamp: "2025-10-30T18:00:00.000Z",
 *   path: "/api/v1/queues"
 * }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract message and errors from exception
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || exception.message;

    const errors =
      typeof exceptionResponse === 'object' && (exceptionResponse as any).errors
        ? (exceptionResponse as any).errors
        : undefined;

    // Build error response
    const errorResponse = {
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message.join(', ') : message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log the error (except 404 Not Found and 401 Unauthorized - too noisy)
    if (status !== HttpStatus.NOT_FOUND && status !== HttpStatus.UNAUTHORIZED) {
      this.logger.error(
        `HTTP ${status} Error: ${errorResponse.message} - ${request.method} ${request.url}`,
        exception.stack,
      );
    }

    response.status(status).json(errorResponse);
  }
}
