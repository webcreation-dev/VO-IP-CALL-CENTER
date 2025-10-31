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
 * All Exceptions Filter
 *
 * Catch-all filter for any unhandled exceptions
 * Catches errors that are not HttpException instances
 *
 * Applied globally via APP_FILTER in app.module.ts
 * Should be registered BEFORE HttpExceptionFilter to catch non-HTTP exceptions first
 *
 * Response format:
 * {
 *   success: false,
 *   statusCode: 500,
 *   message: "Internal server error",
 *   timestamp: "2025-10-30T18:00:00.000Z",
 *   path: "/api/v1/queues"
 * }
 *
 * Security:
 * - Does NOT expose internal error details to clients (in production)
 * - Logs full error with stack trace for debugging
 *
 * @example
 * Unhandled error: new Error('Database connection lost')
 * Client sees: {
 *   success: false,
 *   statusCode: 500,
 *   message: "Internal server error"
 * }
 * Server logs: Full error with stack trace
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and message
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // If it's an HttpException, extract status and message
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
    } else if (exception instanceof Error) {
      // For non-HTTP errors, only expose message in development
      if (process.env.NODE_ENV === 'development') {
        message = exception.message;
      }
    }

    // Build error response
    const errorResponse = {
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message.join(', ') : message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log the full error with stack trace
    if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception: ${exception.message} - ${request.method} ${request.url}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `Unknown Exception: ${JSON.stringify(exception)} - ${request.method} ${request.url}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
